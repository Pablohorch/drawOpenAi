const canvas=document.getElementById('board');
const ctx=canvas.getContext('2d');
let state={tool:'draw',objects:[],current:null,pan:{x:0,y:0},scale:1,isPanning:false};
let space=false,saveTimer;

function resize(){
  state.pan.x=(window.innerWidth-canvas.width)/2;
  state.pan.y=(window.innerHeight-canvas.height)/2;
  draw();
}

function load(){
  const data=localStorage.getItem('draw-data');
  if(data){state.objects=JSON.parse(data);} 
}

function save(){
  localStorage.setItem('draw-data',JSON.stringify(state.objects));
}
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(save,5000);
}

function setTool(t){
  state.tool=t;
  state.current=null;
  canvas.style.cursor='crosshair';
}

document.getElementById('tool-draw').onclick=()=>setTool('draw');
document.getElementById('tool-rect').onclick=()=>setTool('rect');
document.getElementById('tool-line').onclick=()=>setTool('line');

window.addEventListener('keydown',e=>{if(e.code==='Space')space=true;});
window.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});
window.addEventListener('pagehide',save);

function toWorld(x,y){return{x:(x-state.pan.x)/state.scale,y:(y-state.pan.y)/state.scale};}

canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);
  if(e.button===2||space){
    state.isPanning=true;state.startPan={x:e.clientX,y:e.clientY};
    return;
  }
  const p=toWorld(e.clientX,e.clientY);
  if(state.tool==='draw')state.current={type:'path',points:[p]};
  else if(state.tool==='rect')state.current={type:'rect',x:p.x,y:p.y,w:0,h:0};
  else if(state.tool==='line')state.current={type:'line',x1:p.x,y1:p.y,x2:p.x,y2:p.y};
});

canvas.addEventListener('pointermove',e=>{
  if(state.isPanning){
    const dx=e.clientX-state.startPan.x,dy=e.clientY-state.startPan.y;
    state.startPan={x:e.clientX,y:e.clientY};
    state.pan.x+=dx;state.pan.y+=dy;draw();return;
  }
  if(!state.current)return;
  const p=toWorld(e.clientX,e.clientY);
  if(state.current.type==='path')state.current.points.push(p);
  else if(state.current.type==='rect'){state.current.w=p.x-state.current.x;state.current.h=p.y-state.current.y;}
  else if(state.current.type==='line'){state.current.x2=p.x;state.current.y2=p.y;}
  draw();
});

canvas.addEventListener('pointerup',e=>{
  if(state.isPanning){state.isPanning=false;return;}
  if(state.current){state.objects.push(state.current);state.current=null;scheduleSave();draw();}
});

canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const factor=e.deltaY<0?1.1:0.9;
  const newScale=Math.min(4,Math.max(0.1,state.scale*factor));
  const wx=(e.offsetX-state.pan.x)/state.scale;
  const wy=(e.offsetY-state.pan.y)/state.scale;
  state.pan.x=e.offsetX-wx*newScale;
  state.pan.y=e.offsetY-wy*newScale;
  state.scale=newScale;
  draw();
});

function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(state.scale,0,0,state.scale,state.pan.x,state.pan.y);
  ctx.lineCap='round';
  state.objects.forEach(o=>drawObj(o));
  if(state.current)drawObj(state.current);
}

function drawObj(o){
  ctx.strokeStyle='#000';
  ctx.lineWidth=2/state.scale;
  if(o.type==='path'){
    ctx.beginPath();
    ctx.moveTo(o.points[0].x,o.points[0].y);
    o.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
    ctx.stroke();
  }else if(o.type==='rect'){
    ctx.strokeRect(o.x,o.y,o.w,o.h);
  }else if(o.type==='line'){
    ctx.beginPath();
    ctx.moveTo(o.x1,o.y1);ctx.lineTo(o.x2,o.y2);ctx.stroke();
  }
}

window.oncontextmenu=e=>e.preventDefault();
load();
resize();
window.addEventListener('resize',resize);
