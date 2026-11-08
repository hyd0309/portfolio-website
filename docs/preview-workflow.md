# 预览与发布约定

用户明确要求：仅本地预览，直到用户明确确认版本并要求发布，才更新现有 Sites 网站。禁止自动部署。

本次草稿：撤下三张作品和对应配文，加入 Wave 专辑播放器。音频由用户提供可用于网页播放的文件或直链，收到音源前不能声称专辑已可播放。

手动编辑后的现有 Sites 发布流程：读取 Site 与当前权限；获取同一 project_id 的短期源码仓库访问权限；通过插件 site-workflow.mjs 同步源码并打包；save_site_version 保存对应提交与包；deploy_site_version 部署返回的版本 ID；确认部署成功。站点为 public，不可使用 owner-private 发布接口。短期凭据通过 stdin 传入，不写入文件。普通 git commit/push、本地保存或预览不等于完成云端部署。不要虚构独立 Sites CLI 或未核实的后台按钮。

music.json 配置专辑曲目；本地选择音频只在浏览器当前会话试听，不上传。自动播放被浏览器阻止时由用户点击播放，首次有声自动播放不能保证。保留手动暂停，不因重新切换标签页擅自恢复。

用户后续选择：当前先用 Spotify 官方 Wave 专辑嵌入（7L5JR421ajSAQnG8sU0EeX），保留原生音频引擎待以后切换。Spotify iframe API 支持播放/暂停，但未提供音量控制；不应声称它支持自定义淡入或无登录完整专辑自动播放。

最新本地草稿切换为用户选定的 SoundCloud wave-2 单曲，配置 provider=soundcloud，关闭封面展示，使用官方 Widget API 控制播放、暂停、进度、音量和淡入。用户尚未要求发布。研究与验证边界见 soundcloud-research.md。
