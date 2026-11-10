
const PREFIX = "/plugin-archive";
const MAX_BODY_SIZE = 12 * 1024 * 1024;

// Base64 字符串转 Uint8Array
function fromBase64(value) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

// Uint8Array 转 Base64
function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// SHA-256 摘要
async function sha256(value) {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;

  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// 使用 GATEWAY_KEY 对请求信封签名
async function signEnvelope(secret, envelope) {
  const rawKey = fromBase64(secret);

  if (rawKey.length !== 32) {
    throw new Error("GATEWAY_KEY 必须是 Base64 编码的 32 字节密钥");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(envelope)
  );

  return toBase64(new Uint8Array(signature));
}

// 限制请求正文大小，防止超大请求
async function readBody(request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_SIZE) {
    throw new Error("请求内容过大");
  }

  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.length;

      if (size > MAX_BODY_SIZE) {
        await reader.cancel();
        throw new Error("请求内容过大");
      }

      chunks.push(value);
    }
  }

  const body = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  return body;
}

// Pages Function 主入口
export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);

    // 只处理插件归档室路径
    if (
      url.pathname !== PREFIX &&
      !url.pathname.startsWith(PREFIX + "/")
    ) {
      return new Response("Not Found", { status: 404 });
    }

    // 检查环境变量
    if (!env.GATEWAY_KEY || !env.AUDIO_APP_ORIGIN) {
      return new Response("归档服务配置不完整", {
        status: 503
      });
    }

    // 检查 Worker 地址
    const appOrigin = new URL(env.AUDIO_APP_ORIGIN);

    if (
      appOrigin.protocol !== "https:" ||
      appOrigin.pathname !== "/" ||
      appOrigin.search ||
      appOrigin.hash
    ) {
      return new Response("归档服务地址配置错误", {
        status: 503
      });
    }

    // 读取请求正文
    const body = await readBody(request);

    // 生成与 Worker gateway.mjs 完全一致的签名信封
    const envelope = JSON.stringify({
      at: Date.now(),
      url: url.href,
      method: request.method,
      hash: await sha256(body),
      user: "",
      origin: request.headers.get("origin") || ""
    });

    // 只转发应用需要的请求头
    // 不转发浏览器自行提供的身份头或签名头
    const headers = new Headers();

    const allowedHeaders = [
      "content-type",
      "cookie",
      "accept",
      "rsc",
      "next-router-state-tree",
      "next-router-prefetch",
      "x-audio-archive",
      "origin",
      "referer"
    ];

    for (const name of allowedHeaders) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    // 添加服务端生成的签名
    headers.set("x-aa-envelope", envelope);
    headers.set(
      "x-aa-signature",
      await signEnvelope(env.GATEWAY_KEY, envelope)
    );

    // 转发到归档 Worker
    const target = new URL(
      url.pathname + url.search,
      env.AUDIO_APP_ORIGIN
    );

console.log("proxy target:", target.href);

const response = await fetch(target, {
  method: request.method,
  headers,
  body: ["GET", "HEAD"].includes(request.method)
    ? undefined
    : body,
  redirect: "manual"
});

console.log("proxy response:", response.status);
return response;
    
  } catch (error) {
    console.error(
      "plugin-archive proxy failed:",
      error?.stack || error?.message || String(error)
    );
  
    return new Response(
      error.message === "请求内容过大"
        ? "请求内容过大"
        : "归档服务暂不可用，请稍后重试。",
      {
        status: error.message === "请求内容过大" ? 413 : 502,
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
