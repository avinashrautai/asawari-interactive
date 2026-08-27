'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const rooms = [
  { name: 'HALL', w: 10, d: 12, x: -7.5, z: 5 },
  { name: 'BEDROOM', w: 10, d: 10, x: 7, z: 5 },
  { name: 'KITCHEN', w: 8, d: 9, x: -7, z: -6 },
  { name: 'BEDROOM 2', w: 10, d: 10, x: 7, z: -6 },
  { name: 'PASSAGE', w: 4, d: 12, x: 0, z: 3 },
];

type Mode = 'whole' | 'explode' | 'hall' | 'bedroom';

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('whole');
  const [intro, setIntro] = useState(true);
  const [activeRoom, setActiveRoom] = useState('30 × 40 FT');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8e1d5);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    camera.position.set(25, 22, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xfffdf7, 0x8a8175, 2.2);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(18, 32, 16);
    sun.castShadow = true;
    scene.add(sun);

    const addBox = (w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
      o.position.set(x,y,z);
      o.castShadow = true;
      o.receiveShadow = true;
      return o;
    };

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70,55),
      new THREE.MeshStandardMaterial({ color:0xf2ede3, roughness:1 })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);

    const lineMat = new THREE.LineBasicMaterial({ color:0x171513, transparent:true, opacity:.18 });
    for(let x=-20;x<=20;x+=4){
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x,.012,-13),new THREE.Vector3(x,.012,13)
      ]),lineMat));
    }
    for(let z=-12;z<=12;z+=4){
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-20,.012,z),new THREE.Vector3(20,.012,z)
      ]),lineMat));
    }

    const roadMat = new THREE.MeshStandardMaterial({ color:0xb9b1a5, roughness:.95 });
    scene.add(addBox(40,.04,1.1,0,.02,-8,roadMat));
    scene.add(addBox(1.1,.04,25,-11,.02,0,roadMat));
    scene.add(addBox(1.1,.04,25,11,.02,0,roadMat));

    const towerMat = new THREE.MeshStandardMaterial({ color:0xcfc7bb, roughness:.66 });
    const glass = new THREE.MeshStandardMaterial({ color:0x657477, roughness:.18, metalness:.15, transparent:true, opacity:.74 });
    const dark = new THREE.MeshStandardMaterial({ color:0x3d3a36, roughness:.72 });
    const selectedTower = new THREE.Group();
    const floors: THREE.Mesh[] = [];
    for(let i=0;i<9;i++){
      const floor=addBox(7,.92,6,0,-7,0,towerMat);
      selectedTower.add(floor); floors.push(floor);
      for(const x of [-2.2,0,2.2]) floor.add(addBox(.75,.45,.07,x,.05,3.04,glass));
      floor.add(addBox(1.5,.08,1,0,-.05,3.45,dark));
    }
    scene.add(selectedTower);

    const apartment = new THREE.Group();
    apartment.position.y = 10.7;
    scene.add(apartment);
    const wallMat = new THREE.MeshStandardMaterial({ color:0xddd6ca, roughness:.72 });
    const floorMat = new THREE.MeshStandardMaterial({ color:0xbdb4a6, roughness:.9 });
    const accentMat = new THREE.MeshStandardMaterial({ color:0xb3a184, roughness:.65 });
    const roomObjects: THREE.Group[] = [];

    rooms.forEach((r)=>{
      const g=new THREE.Group();
      g.userData={...r};
      const w=r.w*.13,d=r.d*.13;
      g.add(addBox(w,.08,d,0,0,0,floorMat));
      g.add(addBox(w,1,.10,0,.5,-d/2,wallMat));
      g.add(addBox(.10,1,d,-w/2,.5,0,wallMat));
      g.add(addBox(.10,1,d,w/2,.5,0,wallMat));
      g.add(addBox(w,1,.10,0,.5,d/2,wallMat));
      if(r.name==='HALL') g.add(addBox(.9,.18,.3,-.2,.18,.15,dark));
      if(r.name==='BEDROOM') g.add(addBox(.8,.16,.75,0,.16,0,dark));
      if(r.name==='KITCHEN') g.add(addBox(.85,.45,.35,0,.25,-d/2+.25,dark));
      g.position.set(r.x*.13,0,r.z*.13);
      apartment.add(g);
      roomObjects.push(g);
    });
    apartment.add(addBox(.7,1.2,.9,0,.6,-1.5,dark));

    let targetPos=new THREE.Vector3(0,8,0);
    let targetCam=new THREE.Vector3(25,22,28);
    let raf=0;
    let start=performance.now();
    let yaw=0;
    let pitch=0;
    let distance=1;
    let dragging=false;
    let lastX=0;
    let lastY=0;
    let pinchDistance=0;

    const applyCamera=()=>{
      const base=targetCam.clone().sub(targetPos);
      const spherical=new THREE.Spherical().setFromVector3(base);
      spherical.radius*=distance;
      spherical.theta+=yaw;
      spherical.phi=Math.max(.35,Math.min(1.45,spherical.phi+pitch));
      const pos=new THREE.Vector3().setFromSpherical(spherical).add(targetPos);
      camera.position.lerp(pos,.12);
      camera.lookAt(targetPos);
    };

    const tick=()=>{
      const now=performance.now();
      const p=Math.min(1,(now-start)/1200);
      const e=1-Math.pow(1-p,3);
      floors.forEach((f,i)=>{f.position.y=THREE.MathUtils.lerp(-7,i*1.05+.5,e)});
      applyCamera();
      renderer.render(scene,camera);
      raf=requestAnimationFrame(tick);
    };

    const resize=()=>{
      const r=mount.getBoundingClientRect();
      renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);
      camera.aspect=Math.max(.1,r.width)/Math.max(1,r.height);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize',resize);

    const pointerDown=(e:PointerEvent)=>{dragging=true;lastX=e.clientX;lastY=e.clientY};
    const pointerMove=(e:PointerEvent)=>{
      if(!dragging)return;
      yaw-=(e.clientX-lastX)*.008;
      pitch-=(e.clientY-lastY)*.004;
      lastX=e.clientX;lastY=e.clientY;
    };
    const pointerUp=()=>{dragging=false};
    const wheel=(e:WheelEvent)=>{e.preventDefault();distance*=e.deltaY>0?1.08:.92;distance=Math.max(.55,Math.min(2.2,distance))};
    const touchStart=(e:TouchEvent)=>{if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];pinchDistance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}};
    const touchMove=(e:TouchEvent)=>{
      if(e.touches.length!==2||!pinchDistance)return;
      e.preventDefault();
      const a=e.touches[0],b=e.touches[1];
      const next=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      distance*=pinchDistance/next;
      distance=Math.max(.55,Math.min(2.2,distance));
      pinchDistance=next;
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown);
    renderer.domElement.addEventListener('pointermove',pointerMove);
    renderer.domElement.addEventListener('pointerup',pointerUp);
    renderer.domElement.addEventListener('pointercancel',pointerUp);
    renderer.domElement.addEventListener('wheel',wheel,{passive:false});
    renderer.domElement.addEventListener('touchstart',touchStart,{passive:false});
    renderer.domElement.addEventListener('touchmove',touchMove,{passive:false});

    const assemble=()=>{
      roomObjects.forEach(r=>{r.position.set(r.userData.x*.13,0,r.userData.z*.13);r.children.forEach((m:any)=>{if(m.material===accentMat)m.material=wallMat})});
      targetPos.set(0,8,0);targetCam.set(25,22,28);yaw=0;pitch=0;distance=1;
    };
    const explode=()=>{
      roomObjects.forEach(r=>{const n=r.userData.name;let x=0,z=0;if(n==='HALL')x=-1.8;if(n==='BEDROOM')x=1.8;if(n==='KITCHEN')z=-1.8;if(n==='BEDROOM 2')z=1.8;if(n==='PASSAGE')z=-1;r.position.set(r.userData.x*.13+x,n==='PASSAGE'?-.6:0,r.userData.z*.13+z)});
      targetPos.set(0,10,0);targetCam.set(15,15,18);yaw=0;pitch=0;distance=1;
    };
    const focus=(idx:number)=>{
      roomObjects.forEach((r,i)=>r.children.forEach((m:any)=>{if(m.material)m.material=i===idx?accentMat:wallMat}));
      const r=roomObjects[idx];targetPos.set(r.position.x,10.7,r.position.z);targetCam.set(r.position.x+5,15,r.position.z+6);distance=.78;
    };

    (mount as any).__asawari={assemble,explode,focus};
    raf=requestAnimationFrame(tick);

    return()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener('resize',resize);
      renderer.domElement.removeEventListener('pointerdown',pointerDown);
      renderer.domElement.removeEventListener('pointermove',pointerMove);
      renderer.domElement.removeEventListener('pointerup',pointerUp);
      renderer.domElement.removeEventListener('pointercancel',pointerUp);
      renderer.domElement.removeEventListener('wheel',wheel);
      renderer.domElement.removeEventListener('touchstart',touchStart);
      renderer.domElement.removeEventListener('touchmove',touchMove);
      renderer.dispose();
      mount.innerHTML='';
    };
  },[]);

  useEffect(()=>{
    const api=(mountRef.current as any)?.__asawari;
    if(!api)return;
    if(mode==='whole'){api.assemble();setActiveRoom('30 × 40 FT');}
    if(mode==='explode'){api.explode();setActiveRoom('EXPLODED VIEW');}
    if(mode==='hall'){api.assemble();api.focus(0);setActiveRoom('10 × 12 FT');}
    if(mode==='bedroom'){api.assemble();api.focus(1);setActiveRoom('10 × 10 FT');}
  },[mode]);

  useEffect(()=>{const t=setTimeout(()=>setIntro(false),2200);return()=>clearTimeout(t)},[]);

  return <main className="stage">
    <div ref={mountRef} className="sceneMount" />
    <div className={`hero ${!intro?'hide':''}`}><div><div className="eyebrow">VS GROUP</div><h1>ASAWARI</h1><div className="sub">A NEW WAY TO EXPERIENCE HOME</div></div></div>
    <div className="brand show"><small>DEVELOPED BY</small><b>VS GROUP</b></div>
    <div className="meta show"><small>SELECTED RESIDENCE</small><b>ASAWARI · 2 BHK</b></div>
    <div className="panel show"><div className="label">EXPLORE RESIDENCE</div>{[['whole','WHOLE HOME'],['explode','DISASSEMBLE'],['hall','HALL'],['bedroom','BEDROOM']].map(([v,l])=><button key={v} className={mode===v?'active':''} onClick={()=>setMode(v as Mode)}>{l}</button>)}<button onClick={()=>setMode('whole')}>RESET</button></div>
    <div className="dimensions show"><strong>{activeRoom}</strong><div>{mode==='hall'?'HALL':mode==='bedroom'?'BEDROOM':mode==='explode'?'ARCHITECTURAL EXPLODED VIEW':'APARTMENT FOOTPRINT'}</div></div>
    <div className="hint show">DRAG · ROTATE &nbsp; SCROLL / PINCH · ZOOM</div>
  </main>;
}
