'use strict';
const works = [
  {title:'Wave — 让留白有声音',image:'assets/wave.jpg',alt:'绿色与青蓝色的 Wave 音乐视觉设计',description:'音乐视觉与版式练习。绿色延伸出唱片边界，横向蓝色水面建立节奏，手写文字与规整框架并置。音乐素材版权归原权利人所有。'},
  {title:'把祝福写大一点',image:'assets/birthday.jpg',alt:'蓝色手写生日快乐海报',description:'字体与海报练习。保留书写速度与笔触，柔焦色块与大面积留白共同组织画面。'},
  {title:'蓝色里的私人空间',image:'assets/tao.jpg',alt:'深蓝色陶喆音乐视觉设计',description:'音乐视觉练习。以浓蓝、颗粒与涂抹构建空间，以白色手写文字形成对照。音乐素材版权归原权利人所有。'}
];
const viewer=document.querySelector('#viewer');
document.querySelectorAll('[data-work]').forEach(button=>button.addEventListener('click',()=>{
  const work=works[Number(button.dataset.work)];
  document.querySelector('#viewer-title').textContent=work.title;
  const image=document.querySelector('#viewer-image');image.src=work.image;image.alt=work.alt;
  document.querySelector('#viewer-description').textContent=work.description;
  viewer.showModal();document.body.classList.add('modal-open');
}));
document.querySelector('#close-viewer').addEventListener('click',()=>viewer.close());
viewer.addEventListener('close',()=>document.body.classList.remove('modal-open'));
viewer.addEventListener('click',event=>{if(event.target===viewer){const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)viewer.close();}});
const hue=document.querySelector('#hue'),blur=document.querySelector('#blur'),experiment=document.querySelector('#experiment');
function updateExperiment(){const h=Number(hue.value),b=Number(blur.value);experiment.style.setProperty('--angle',`${-h*1.35}deg`);experiment.style.setProperty('--diffusion',`${10+b*.5}px`);document.querySelector('#hue-value').textContent=h===0?'蓝 / BLUE':`${h}%`;document.querySelector('#blur-value').textContent=`${b}%`;}
hue.addEventListener('input',updateExperiment);blur.addEventListener('input',updateExperiment);
document.querySelector('#reset').addEventListener('click',()=>{hue.value='0';blur.value='50';updateExperiment();});updateExperiment();
