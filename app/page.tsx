'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';

type Mode='masterplan'|'building'|'explode'|'hall'|'bedroom';
const rooms=[
{name:'HALL',w:10,d:12,x:-7.5,z:6.5},{name:'MASTER BEDROOM',w:10,d:10,x:7.5,z:6.5},
{name:'KITCHEN',w:8,d:9,x:-7.5,z:-6.5},{name:'BEDROOM 2',w:10,d:10,x:7.5,z:-6.5},
{name:'PASSAGE',w:4,d:25,x:0,z:0}
];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

export default function Home(){
const mount=useRef<HTMLDivElement>(null);const[mode,setMode]=useState<Mode>('masterplan');const[intro,setIntro]=useState(true);const[info,setInfo]=useState('MASTERPLAN');const[measure,setMeasure]=useState('SITE LAYOUT');
useEffect(()=>{const el=mount.current;if(!el)return;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xe6ddcf);const camera=new THREE.PerspectiveCamera(34,1,.1,800);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;el.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xfffbf3,0x655d52,2.5));const sun=new THREE.DirectionalLight(0xfff1d9,4);sun.position.set(25,42,20);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const mat=(c:number,r=.65,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,p:THREE.Object3D=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o};
box(90,.16,62,0,-.2,0,mat(0xd7cfc2,1));
const paper=new THREE.Group();const pm=new THREE.Mesh(new THREE.PlaneGeometry(48,30),new THREE.MeshStandardMaterial({color:0xf1e8d9,roughness:.9}));pm.rotation.x=-Math.PI/2;pm.position.y=.02;paper.add(pm);scene.add(paper);new THREE.TextureLoader().load('/paper-map.svg',t=>{t.colorSpace=THREE.SRGBColorSpace;(pm.material as THREE.MeshStandardMaterial).map=t;(pm.material as THREE.MeshStandardMaterial).needsUpdate=true});

const tower=new THREE.Group();scene.add(tower);const facade=mat(0xd7cfc2,.55),slab=mat(0xb3a899,.72),glass=mat(0x36575d,.12,.15),frame=mat(0x383530,.45),gold=mat(0xb58b5e,.55);const floors:THREE.Group[]=[];
for(let i=0;i<10;i++){const f=new THREE.Group();f.userData.baseY=.7+i*2.35;f.position.y=-8;box(16,1.55,11,0,0,0,facade,f);box(16.5,.16,11.5,0,.83,0,slab,f);box(16.5,.16,11.5,0,-.83,0,slab,f);
for(const x of[-6,-2,2,6]){box(2.5,1.05,.08,x,0,5.55,glass,f);box(.08,1.15,.16,x-1.3,0,5.5,frame,f);box(.08,1.15,.16,x+1.3,0,5.5,frame,f)}
box(3.2,.14,1.7,-4.5,-.7,6.25,gold,f);box(3.2,.14,1.7,4.5,-.7,6.25,gold,f);box(.12,1.0,11.2,-7.8,0,0,frame,f);box(.12,1.0,11.2,7.8,0,0,frame,f);floors.push(f);tower.add(f)}
box(5,1.7,3.8,0,24.4,0,frame,tower);box(3.5,.25,4.6,0,25.4,0,gold,tower);

const apartment=new THREE.Group();apartment.visible=false;scene.add(apartment);const scale=.45;const wall=mat(0xe6dccb,.78),floor=mat(0xc8bca9,.9),wood=mat(0x9b7350,.58),dark=mat(0x393733,.5),highlight=mat(0xc79a68,.5);const rg:THREE.Group[]=[];
rooms.forEach(r=>{const g=new THREE.Group();g.userData=r;const w=r.w*scale,d=r.d*scale,h=.55;box(w,.12,d,0,0,0,floor,g);box(w,h,.12,0,h/2,-d/2,wall,g);box(.12,h,d,-w/2,h/2,0,wall,g);box(.12,h,d,w/2,h/2,0,wall,g);box(w,h,.12,0,h/2,d/2,wall,g);
if(r.name==='HALL'){box(1.9,.15,.75,0,.18,-.6,wood,g);box(2.3,.35,.12,0,.38,d/2-.4,dark,g)}
if(r.name.includes('BEDROOM')){box(1.55,.16,2,0,.18,0,wood,g);box(1.55,.38,.12,0,.36,-1,dark,g);box(.45,.18,.5,-1.1,.2,1,dark,g);box(.45,.18,.5,1.1,.2,1,dark,g)}
if(r.name==='KITCHEN'){box(w-.3,.35,.45,0,.27,-d/2+.3,wood,g);box(.7,.4,.55,0,.32,.15,dark,g)}
if(r.name==='PASSAGE'){box(.7,.2,1.2,0,.2,-4,dark,g)}
g.position.set(r.x*scale,0,r.z*scale);rg.push(g);apartment.add(g)});
box(1.7,.8,1.8,0,.4,0,dark,apartment);box(2.1,.12,1.7,0,.86,0,wood,apartment);

let yaw=0,pitch=-.42,zoom=1,drag=false,lx=0,ly=0,pinch=0,target=new THREE.Vector3(0,3,0),base=new THREE.Vector3(0,42,28);
const cam=()=>{const s=new THREE.Spherical().setFromVector3(base.clone().sub(target));s.radius*=zoom;s.theta+=yaw;s.phi=clamp(s.phi+pitch,.14,1.5);camera.position.lerp(new THREE.Vector3().setFromSpherical(s).add(target),.1);camera.lookAt(target)};
const resize=()=>{const r=el.getBoundingClientRect(),a=r.width/Math.max(1,r.height);renderer.setSize(r.width,r.height,false);camera.aspect=a;camera.updateProjectionMatrix();if(a<.78){if(mode==='masterplan')base.set(0,48,26);else if(mode==='building')base.set(19,28,25);else base.set(13,15,17)}else{if(mode==='masterplan')base.set(0,42,28);else if(mode==='building')base.set(21,22,25);else base.set(16,14,18)}};resize();addEventListener('resize',resize);
const down=(e:PointerEvent)=>{drag=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId)};const move=(e:PointerEvent)=>{if(!drag)return;yaw-=(e.clientX-lx)*.0055;pitch=clamp(pitch-(e.clientY-ly)*.003,-.75,.5);lx=e.clientX;ly=e.clientY};const up=()=>drag=false;const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY>0?1.07:.93),.48,2)};const ts=(e:TouchEvent)=>{if(e.touches.length===2)pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)};const tm=(e:TouchEvent)=>{if(e.touches.length!==2||!pinch)return;e.preventDefault();const n=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom=clamp(zoom*pinch/n,.48,2);pinch=n};renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('touchstart',ts,{passive:false});renderer.domElement.addEventListener('touchmove',tm,{passive:false});
let raf=0;const started=performance.now();const animate=()=>{const p=Math.min(1,(performance.now()-started)/1500),e=1-Math.pow(1-p,3);floors.forEach(f=>f.position.y=THREE.MathUtils.lerp(-8,f.userData.baseY,e));cam();renderer.render(scene,camera);raf=requestAnimationFrame(animate)};animate();
(el as any).api={masterplan:()=>{paper.visible=true;tower.visible=true;apartment.visible=false;target.set(0,2,0);base.set(0,42,28);yaw=0;pitch=-.48;zoom=1},building:()=>{paper.visible=true;tower.visible=true;apartment.visible=false;target.set(0,12,0);base.set(21,22,25);yaw=0;pitch=-.18;zoom=.82},explode:()=>{paper.visible=false;tower.visible=false;apartment.visible=true;target.set(0,0,0);base.set(16,14,18);yaw=0;pitch=-.1;zoom=.88;rg.forEach(g=>{const r=g.userData as typeof rooms[number];const q=r.name==='PASSAGE'?{x:0,z:-1.1}:r.name==='HALL'?{x:-1.3,z:.7}:r.name==='MASTER BEDROOM'?{x:1.3,z:.7}:r.name==='KITCHEN'?{x:-1,z:-1}:{x:1,z:-1};g.position.set(r.x*scale+q.x,r.name==='PASSAGE'?-1:0,r.z*scale+q.z)})},focus:(i:number)=>{(el as any).api.explode();const g=rg[i];target.set(g.position.x,.1,g.position.z);base.set(g.position.x+7,7.5,g.position.z+8);zoom=.8;rg.forEach((q,j)=>q.scale.setScalar(j===i?1.06:.88))}};
return()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize);renderer.dispose();el.innerHTML=''}},[mode]);
useEffect(()=>{const a=(mount.current as any)?.api;if(!a)return;if(mode==='masterplan'){a.masterplan();setInfo('MASTERPLAN');setMeasure('SITE LAYOUT')}if(mode==='building'){a.building();setInfo('ASAWARI · 10 STOREYS');setMeasure('TOWER REVEAL')}if(mode==='explode'){a.explode();setInfo('ASAWARI · 2 BHK');setMeasure('30 × 40 FT')}if(mode==='hall'){a.focus(0);setInfo('HALL');setMeasure('10 × 12 FT')}if(mode==='bedroom'){a.focus(1);setInfo('MASTER BEDROOM');setMeasure('10 × 10 FT')}},[mode]);
useEffect(()=>{const t=setTimeout(()=>setIntro(false),2200);return()=>clearTimeout(t)},[]);
return <main className="stage"><div ref={mount} className="sceneMount"/><div className={`hero ${!intro?'hide':''}`}><div><div className="eyebrow">VS GROUP</div><h1>ASAWARI</h1><div className="sub">A NEW WAY TO EXPERIENCE HOME</div></div></div><div className="brand show"><small>DEVELOPED BY</small><b>VS GROUP</b></div><div className="meta show"><small>SELECTED RESIDENCE</small><b>{info}</b></div><div className="panel show"><div className="label">EXPLORE RESIDENCE</div>{[['masterplan','MASTERPLAN'],['building','BUILDING'],['explode','DISASSEMBLE'],['hall','HALL'],['bedroom','BEDROOM']].map(([v,l])=><button key={v} className={mode===v?'active':''} onClick={()=>setMode(v as Mode)}>{l}</button>)}</div><div className="dimensions show"><strong>{measure}</strong><div>{mode==='masterplan'?'MASTERPLAN':mode==='building'?'ARCHITECTURAL REVEAL':mode==='explode'?'EXPLODED FLOOR PLAN':mode==='hall'?'HALL':'MASTER BEDROOM'}</div></div><div className="hint show">DRAG · ROTATE · PINCH TO EXPLORE</div></main>}
