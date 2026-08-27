'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';

type Mode='masterplan'|'building'|'explode'|'hall'|'bedroom';
const rooms=[
 {name:'HALL',w:10,d:12,x:-7,z:5},
 {name:'MASTER BEDROOM',w:10,d:10,x:7,z:5},
 {name:'KITCHEN',w:8,d:9,x:-7,z:-6},
 {name:'BEDROOM 2',w:10,d:10,x:7,z:-6},
 {name:'PASSAGE',w:4,d:12,x:0,z:3}
];

export default function Home(){
 const mount=useRef<HTMLDivElement>(null);
 const [mode,setMode]=useState<Mode>('masterplan');
 const [intro,setIntro]=useState(true);
 const [info,setInfo]=useState('MASTERPLAN');
 const [measure,setMeasure]=useState('SITE LAYOUT');

 useEffect(()=>{
  const el=mount.current;if(!el)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xe9e1d3);
  const camera=new THREE.PerspectiveCamera(36,1,.1,500);
  camera.position.set(0,48,30);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;el.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xfffaf1,0x756b5d,2.4));
  const sun=new THREE.DirectionalLight(0xfff8e9,4);sun.position.set(20,35,18);sun.castShadow=true;scene.add(sun);
  const mat=(c:number,r=.65,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
  const add=(w:number,h:number,d:number,x:number,y:number,z:number,ma:THREE.Material)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),ma);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o};
  const ground=add(65,.18,48,0,-.12,0,mat(0xf5efe4,1));scene.add(ground);

  // Realistic paper masterplan: texture from the project SVG, physically laid on the ground.
  const mapGroup=new THREE.Group();
  const map=new THREE.Mesh(new THREE.PlaneGeometry(31,19.375),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92}));
  map.rotation.x=-Math.PI/2;map.position.y=.03;mapGroup.add(map);scene.add(mapGroup);
  new THREE.TextureLoader().load('/paper-map.svg',(t)=>{t.colorSpace=THREE.SRGBColorSpace;(map.material as THREE.MeshStandardMaterial).map=t;(map.material as THREE.MeshStandardMaterial).needsUpdate=true;});

  const tower=new THREE.Group();tower.position.set(0,0,0);scene.add(tower);
  const floorMat=mat(0xd3c9ba,.58),slabMat=mat(0xb5aa9a,.72),glass=mat(0x5d6d6e,.16,.18),frame=mat(0x514a42,.45),warm=mat(0xc6a77b,.6);
  const floors:THREE.Group[]=[];
  for(let i=0;i<10;i++){
   const g=new THREE.Group();g.position.y=-8;g.userData.baseY=1.25+i*1.35;
   g.add(add(10,1.05,7.5,0,0,0,floorMat));g.add(add(10.35,.18,7.85,0,.52,0,slabMat));
   for(const x of[-3.7,-1.2,1.2,3.7]){g.add(add(1.65,.82,.08,x,.02,3.79,glass));g.add(add(.08,1,.12,x-0.86,.02,3.72,frame));g.add(add(.08,1,.12,x+0.86,.02,3.72,frame));}
   for(const x of[-4.35,4.35])g.add(add(.14,.75,2.6,x,.18,3.15,frame));
   g.add(add(2.7,.12,.55,0,.04,4.05,warm));g.add(add(.12,.9,6.9,-5,.18,0,frame));g.add(add(.12,.9,6.9,5,.18,0,frame));
   floors.push(g);tower.add(g);
  }
  // roof crown / lift core
  const crown=add(3.2,1.4,2.7,0,14.15,0,frame);tower.add(crown);

  const apartment=new THREE.Group();apartment.position.set(0,14,0);scene.add(apartment);
  const wall=mat(0xe1d8ca,.7),floor=mat(0xb9ad9c,.88),accent=mat(0xb99a6f,.55);
  const roomMeshes:THREE.Group[]=[];
  rooms.forEach(r=>{const g=new THREE.Group();g.userData=r;const w=r.w*.18,d=r.d*.18;
   g.add(add(w,.1,d,0,0,0,floor));
   g.add(add(w,1,.12,0,.52,-d/2,wall));g.add(add(.12,1,d,-w/2,.52,0,wall));g.add(add(.12,1,d,w/2,.52,0,wall));g.add(add(w,1,.12,0,.52,d/2,wall));
   if(r.name.includes('BED'))g.add(add(1.15,.16,.72,0,.16,0,accent));
   if(r.name==='HALL')g.add(add(1.3,.16,.55,-.3,.16,.1,accent));
   if(r.name==='KITCHEN')g.add(add(1.15,.5,.38,0,.25,-d/2+.3,accent));
   g.position.set(r.x*.18,0,r.z*.18);roomMeshes.push(g);apartment.add(g);
  });
  apartment.add(add(.9,1.3,1.1,0,.65,-1.4,frame));apartment.visible=false;

  let yaw=0,pitch=-.35,zoom=1,drag=false,lx=0,ly=0,pinch=0;
  let target=new THREE.Vector3(0,2,0),baseCam=new THREE.Vector3(0,48,30);
  const camUpdate=()=>{const v=baseCam.clone().sub(target),s=new THREE.Spherical().setFromVector3(v);s.radius*=zoom;s.theta+=yaw;s.phi=Math.max(.18,Math.min(1.5,s.phi+pitch));camera.position.lerp(new THREE.Vector3().setFromSpherical(s).add(target),.09);camera.lookAt(target)};
  const resize=()=>{const r=el.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix()};resize();addEventListener('resize',resize);
  const down=(e:PointerEvent)=>{drag=true;lx=e.clientX;ly=e.clientY};const move=(e:PointerEvent)=>{if(!drag)return;yaw-=(e.clientX-lx)*.006;pitch-=(e.clientY-ly)*.0035;pitch=Math.max(-.8,Math.min(.55,pitch));lx=e.clientX;ly=e.clientY};const up=()=>drag=false;
  const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=Math.max(.48,Math.min(2.3,zoom*(e.deltaY>0?1.08:.92)))};
  const ts=(e:TouchEvent)=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinch=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}};
  const tm=(e:TouchEvent)=>{if(e.touches.length===2&&pinch){e.preventDefault();const a=e.touches[0],b=e.touches[1],n=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);zoom=Math.max(.48,Math.min(2.3,zoom*pinch/n));pinch=n}};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('touchstart',ts,{passive:false});renderer.domElement.addEventListener('touchmove',tm,{passive:false});

  let raf=0,start=performance.now();const animate=()=>{const p=Math.min(1,(performance.now()-start)/1500),e=1-Math.pow(1-p,3);floors.forEach((f,i)=>f.position.y=THREE.MathUtils.lerp(-8,f.userData.baseY,e));camUpdate();renderer.render(scene,camera);raf=requestAnimationFrame(animate)};animate();
  (el as any).api={showMaster:()=>{mapGroup.visible=true;tower.visible=true;apartment.visible=false;target.set(0,1,0);baseCam.set(0,48,30);yaw=0;pitch=-.45;zoom=1},showBuilding:()=>{mapGroup.visible=true;tower.visible=true;apartment.visible=false;target.set(0,6,0);baseCam.set(20,20,24);pitch=-.2;zoom=.82},explode:()=>{mapGroup.visible=false;tower.visible=true;apartment.visible=true;target.set(0,14,0);baseCam.set(16,13,19);pitch=-.1;zoom=.8;roomMeshes.forEach(r=>{const n=r.userData.name;let x=0,z=0;if(n==='HALL')x=-2;if(n==='MASTER BEDROOM')x=2;if(n==='KITCHEN')z=-2;if(n==='BEDROOM 2')z=2;if(n==='PASSAGE')z=-1;r.position.set(r.userData.x*.18+x,r.userData.name==='PASSAGE'?-1:0,r.userData.z*.18+z)})},focus:(i:number)=>{apartment.visible=true;mapGroup.visible=false;const r=roomMeshes[i];roomMeshes.forEach((q,j)=>q.children.forEach((m:any)=>{if(m.material)m.material=j===i?accent:wall}));target.set(r.position.x,14,r.position.z);baseCam.set(r.position.x+6,16,r.position.z+7);zoom=.72}};
  return()=>{cancelAnimationFrame(raf);removeEventListener('resize',resize);renderer.dispose();el.innerHTML=''};
 },[]);

 useEffect(()=>{const a=(mount.current as any)?.api;if(!a)return;if(mode==='masterplan'){a.showMaster();setInfo('MASTERPLAN');setMeasure('SITE LAYOUT')}if(mode==='building'){a.showBuilding();setInfo('ASAWARI · 10 STOREYS');setMeasure('TOWER REVEAL')}if(mode==='explode'){a.explode();setInfo('ASAWARI · 2 BHK');setMeasure('30 × 40 FT')}if(mode==='hall'){a.explode();a.focus(0);setInfo('HALL');setMeasure('10 × 12 FT')}if(mode==='bedroom'){a.explode();a.focus(1);setInfo('MASTER BEDROOM');setMeasure('10 × 10 FT')}},[mode]);
 useEffect(()=>{const t=setTimeout(()=>setIntro(false),2300);return()=>clearTimeout(t)},[]);
 return <main className="stage"><div ref={mount} className="sceneMount"/>
  <div className={`hero ${!intro?'hide':''}`}><div><div className="eyebrow">VS GROUP</div><h1>ASAWARI</h1><div className="sub">A NEW WAY TO EXPERIENCE HOME</div></div></div>
  <div className="brand show"><small>DEVELOPED BY</small><b>VS GROUP</b></div><div className="meta show"><small>SELECTED RESIDENCE</small><b>{info}</b></div>
  <div className="panel show"><div className="label">EXPLORE RESIDENCE</div>{[['masterplan','MASTERPLAN'],['building','BUILDING'],['explode','DISASSEMBLE'],['hall','HALL'],['bedroom','BEDROOM']].map(([v,l])=><button key={v} className={mode===v?'active':''} onClick={()=>setMode(v as Mode)}>{l}</button>)}</div>
  <div className="dimensions show"><strong>{measure}</strong><div>{mode==='masterplan'?'MASTERPLAN':mode==='building'?'ARCHITECTURAL REVEAL':mode==='explode'?'EXPLODED FLOOR PLAN':mode==='hall'?'HALL':'MASTER BEDROOM'}</div></div><div className="hint show">DRAG · ROTATE &nbsp; SCROLL / PINCH · ZOOM</div>
 </main>;
}
