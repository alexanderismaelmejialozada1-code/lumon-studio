import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface RobotPose {
  wave: number;
  blink: number;
  smile: number;
  phase: number;
  gazeX?: number;
  gazeY?: number;
}
export interface RobotScene { paint: (pose: RobotPose) => void; resize: () => void; dispose: () => void }

/** Lumon's rounded, ivory mascot: real joints and facial geometry, rendered on demand. */
export async function createRobotScene(canvas: HTMLCanvasElement, context: WebGL2RenderingContext, logoUrl?: string): Promise<RobotScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = environmentGenerator.fromScene(room, .04, .1, 100, { size: 64 });
  scene.environment = environment.texture;
  scene.environmentIntensity = .55;
  room.dispose(); environmentGenerator.dispose();
  const camera = new THREE.OrthographicCamera(-2.5, 2.5, 2.7, -2.7, .1, 30);
  camera.position.set(0, 2.9, 12); camera.lookAt(0, 2.35, 0);
  scene.add(new THREE.HemisphereLight(0xe4f0f6, 0x405967, 1.3));
  const key = new THREE.DirectionalLight(0xffe6ba, 2.4); key.position.set(-4, 6, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xb6dbeb, .9); fill.position.set(4, 3, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x37c6ed, 2); rim.position.set(3, 4, -3); scene.add(rim);

  const grain = document.createElement('canvas'); grain.width = grain.height = 256;
  const g = grain.getContext('2d')!; g.fillStyle = '#d6c9ac'; g.fillRect(0, 0, 256, 256);
  let seed = 2166136261;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1250; i++) {
    g.fillStyle = 'rgba(87,66,43,' + (.07 + random() * .22) + ')';
    g.beginPath(); g.arc(random()*256, random()*256, .25 + random() * .7, 0, Math.PI*2); g.fill();
  }
  const texture = new THREE.CanvasTexture(grain); texture.colorSpace = THREE.SRGBColorSpace;
  const relief = new THREE.CanvasTexture(grain);
  const brushed = document.createElement('canvas'); brushed.width = brushed.height = 128;
  const brush = brushed.getContext('2d')!; brush.fillStyle='#dddddd'; brush.fillRect(0,0,128,128);
  for(let i=0;i<128;i++){brush.fillStyle='rgba(45,55,60,'+(.06+random()*.18)+')';brush.fillRect(0,i,128,.5);}
  const brushing = new THREE.CanvasTexture(brushed);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=64;
  const shadowContext=shadowCanvas.getContext('2d')!;const shadowGradient=shadowContext.createRadialGradient(64,32,4,64,32,58);
  shadowGradient.addColorStop(0,'rgba(0,0,0,.5)');shadowGradient.addColorStop(.55,'rgba(0,0,0,.2)');shadowGradient.addColorStop(1,'rgba(0,0,0,0)');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,128,64);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const ivory = new THREE.MeshPhysicalMaterial({ map: texture, bumpMap: relief, bumpScale: .006, roughness: .39, metalness: .22, clearcoat: .38, clearcoatRoughness: .25 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x173844, roughnessMap: brushing, roughness: .38, metalness: .75 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x527885, roughnessMap: brushing, bumpMap: brushing, bumpScale: .003, roughness: .35, metalness: .75 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a7758, roughness: .4, metalness: .7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x031116, roughness: .14, metalness: .24, clearcoat: 1 });
  const cyan = new THREE.MeshBasicMaterial({ color: 0x63eff6, toneMapped: false });
  const highlight = new THREE.MeshBasicMaterial({ color: 0xc2fcff, toneMapped: false });
  const trim = new THREE.MeshStandardMaterial({ color: 0x08728b, metalness: .6, roughness: .29 });
  const geometries = new Map<string, THREE.BufferGeometry>();
  const box = (w:number,h:number,d:number,r:number) => {
    const id = [w,h,d,r].join(',');
    if (!geometries.has(id)) geometries.set(id, new RoundedBoxGeometry(w,h,d,4,r));
    return geometries.get(id)!;
  };
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
  const ring = new THREE.TorusGeometry(1, .055, 8, 36);
  const eyeRing = new THREE.TorusGeometry(.2, .043, 8, 36);
  const robot = new THREE.Group(); robot.name = 'Lumon_robot'; robot.rotation.y = -.32; scene.add(robot);
  const upper = new THREE.Group(); upper.name = 'body_joint'; upper.position.y = 1.3; robot.add(upper);
  const mesh = (parent:THREE.Object3D, name:string, geometry:THREE.BufferGeometry, material:THREE.Material, position:number[], scale?:number[]) => {
    const object = new THREE.Mesh(geometry, material); object.name=name; object.position.set(position[0],position[1],position[2]);
    if (scale) object.scale.set(scale[0],scale[1],scale[2]); parent.add(object); return object;
  };
  const cube = (p:THREE.Object3D,n:string,x:number,y:number,z:number,w:number,h:number,d:number,r:number,m:THREE.Material) => mesh(p,n,box(w,h,d,r),m,[x,y,z]);
  const floorShadow=mesh(scene,'floor_shadow',new THREE.PlaneGeometry(3.1,1.05),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false}),[0,.025,-.25]);
  floorShadow.rotation.x=-Math.PI/2;
  const ball = (p:THREE.Object3D,n:string,x:number,y:number,z:number,r:number,m:THREE.Material) => mesh(p,n,sphere,m,[x,y,z],[r,r,r]);
  const tube = (p:THREE.Object3D,n:string,points:THREE.Vector3[],radius:number,m:THREE.Material) => mesh(p,n,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,6,false),m,[0,0,0]);
  const polyline = (p:THREE.Object3D,n:string,points:THREE.Vector3[],radius:number,m:THREE.Material) => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));
    return mesh(p,n,new THREE.TubeGeometry(path,points.length*6,radius,6,false),m,[0,0,0]);
  };
  const band = (p:THREE.Object3D,n:string,x:number,y:number,z:number,r:number,m:THREE.Material) => {
    const b=mesh(p,n,ring,m,[x,y,z],[r,r,r]); b.rotation.x=Math.PI/2; return b;
  };
  const screw = (p:THREE.Object3D,x:number,y:number,z:number) => {
    ball(p,'shell_screw',x,y,z,.028,brass);
    cube(p,'screw_slot',x,y,z+.024,.024,.005,.006,.002,metal);
  };

  for (const side of [-1,1]) {
    const leg=new THREE.Group();leg.name='hip_joint_'+side;leg.position.set(side*.44,1.28,0);robot.add(leg);
    ball(leg,'hip',0,-.03,0,.26,metal);
    mesh(leg,'thigh_shell',cylinder,ivory,[0,-.27,0],[.27,.34,.27]);
    band(leg,'thigh_band',0,-.25,0,.24,brass);
    ball(leg,'knee',0,-.49,.01,.24,metal);
    mesh(leg,'shin',cylinder,ivory,[0,-.7,0],[.26,.3,.26]);
    band(leg,'shin_ring',0,-.63,0,.24,steel);
    band(leg,'ankle_ring',0,-.86,0,.27,steel);
    cube(leg,'boot',0,-1.115,.13,.75,.25,.98,.105,metal);
    mesh(leg,'boot_armor',sphere,ivory,[0,-.985,.17],[.35,.245,.435]);
    cube(leg,'sole',0,-1.22,.13,.77,.12,.99,.04,steel);
    for(const x of [-.19,.19])screw(leg,x,-1.025,.614);
  }
  cube(upper,'waist',0,.02,0,1.25,.24,.91,.11,metal);
  cube(upper,'torso_shell',0,.65,0,1.78,1.42,1.22,.45,ivory);
  cube(upper,'lower_armor',0,.13,.015,1.35,.23,.99,.1,metal);
  cube(upper,'chest_rim',0,.71,.493,.92,.94,.36,.17,brass);
  cube(upper,'chest_trim',0,.71,.53,.82,.84,.34,.16,trim);
  cube(upper,'chest_display',0,.71,.557,.72,.74,.33,.155,glass);
  let logoTexture:THREE.Texture|null=null;
  try{if(logoUrl){logoTexture=await new THREE.TextureLoader().loadAsync(logoUrl);logoTexture.colorSpace=THREE.SRGBColorSpace;logoTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}}
  catch{logoTexture=null;}
  if(logoTexture){
    const logoMaterial=new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,alphaTest:.02,depthWrite:false,toneMapped:false});
    mesh(upper,'lumon_profile_logo',new THREE.PlaneGeometry(.62,.62),logoMaterial,[0,.71,.745]);
  }else{
    const hex=Array.from({length:7},(_,i)=>{const a=Math.PI/6+i*Math.PI/3;return new THREE.Vector3(Math.cos(a)*.265,.71+Math.sin(a)*.265,.737);});
    polyline(upper,'chest_hexagon',hex,.018,cyan);
  }
  for(const x of [-.63,.63])for(const y of [.3,1.05])screw(upper,x,y,.482);
  for(let i=0;i<3;i++)cube(upper,'torso_vent',.64,.51+i*.065,.48,.12,.018,.014,.005,metal);
  for(const x of [-.49,.49]){
    cube(upper,'chest_panel_seam',x,.7,.59,.018,.71,.015,.004,brass);
    ball(upper,'chest_status_light',x,.28,.59,.022,cyan);
  }

  const arms:{shoulder:THREE.Group;elbow:THREE.Group;hand:THREE.Group;fingers:THREE.Group[];side:number}[]=[];
  for (const side of [-1,1]) {
    const shoulder=new THREE.Group();shoulder.name=side===-1?'greeting_shoulder':'resting_shoulder';shoulder.position.set(side*.97,1.03,0);upper.add(shoulder);
    ball(shoulder,'shoulder_joint',0,0,0,.295,metal);
    for(const [offset,radius,height,material] of [[.12,.27,.12,brass],[.20,.21,.065,steel],[.235,.155,.015,trim]] as const){
      const cap=mesh(shoulder,'shoulder_cap',cylinder,material,[side*offset,0,0],[radius,height,radius]);cap.rotation.z=Math.PI/2;
    }
    for(let i=0;i<4;i++){const a=i*Math.PI/2;ball(shoulder,'shoulder_fastener',side*.26,Math.cos(a)*.18,Math.sin(a)*.18,.018,brass);}
    cube(shoulder,'upper_arm',0,-.29,0,.45,.45,.48,.17,ivory);
    const elbow=new THREE.Group();elbow.name='elbow_'+side;elbow.position.y=-.53;shoulder.add(elbow);
    ball(elbow,'elbow_joint',0,0,0,.21,metal);
    band(elbow,'elbow_trim',0,-.035,0,.22,steel);
    band(elbow,'forearm_cuff',0,-.10,.01,.245,brass);
    cube(elbow,'forearm',0,-.27,.01,.47,.43,.51,.175,ivory);
    for(const x of [-.12,.12])screw(elbow,x,-.24,.27);
    mesh(elbow,'wrist',cylinder,metal,[0,-.51,.015],[.17,.11,.17]);
    const hand=new THREE.Group();hand.name='hand_'+side;hand.position.set(0,-.64,.04);elbow.add(hand);
    cube(hand,'palm',0,0,0,.38,.27,.25,.085,metal);
    band(hand,'wrist_ring',0,.15,0,.18,steel);
    const fingers:THREE.Group[]=[];
    for(const [index,x] of [-.135,-.045,.045,.135].entries()){
      const finger=new THREE.Group();finger.name='finger_joint_'+index;finger.position.set(x,-.13,.01);hand.add(finger);
      ball(finger,'knuckle',0,0,0,.053,steel);
      mesh(finger,'finger_segment',cylinder,steel,[0,-.105,0],[.045,.17,.045]);
      ball(finger,'finger_knuckle',0,-.195,0,.049,metal);
      mesh(finger,'finger_tip',cylinder,metal,[0,-.265,.023],[.047,.115,.047]).rotation.x=-.22;
      ball(finger,'finger_end',0,-.32,.04,.047,steel);fingers.push(finger);
    }
    const thumb=cube(hand,'thumb',side*.24,-.055,.065,.1,.25,.14,.045,steel);thumb.rotation.z=side*-.5;
    arms.push({shoulder,elbow,hand,fingers,side});
  }

  mesh(upper,'neck',cylinder,metal,[0,1.30,0],[.29,.13,.29]);
  const head=new THREE.Group();head.name='head_joint';head.position.set(0,1.24,0);upper.add(head);
  cube(head,'head_shell',0,.82,0,2.18,1.74,1.52,.56,ivory);
  cube(head,'rear_seam',0,.82,-.27,2.19,1.69,1.01,.46,brass);
  cube(head,'front_shell',0,.82,.175,2.12,1.68,1.2,.53,ivory);
  cube(head,'face_outer_rim',0,.82,.51,1.87,1.40,.63,.315,brass);
  cube(head,'face_trim',0,.82,.547,1.81,1.34,.63,.31,trim);
  cube(head,'face_bezel',0,.82,.58,1.73,1.26,.61,.30,metal);
  cube(head,'face_glass',0,.82,.635,1.61,1.14,.60,.29,glass);
  for(const x of [-.94,.94])for(const y of [.30,1.34])screw(head,x,y,.615);
  for(const side of [-1,1]){
    cube(head,'shell_inset_seam',side*.84,1.56,.38,.21,.012,.016,.004,brass);
    for(let i=0;i<3;i++)cube(head,'temple_vent',side*.96,.44+i*.052,.64,.085,.012,.016,.004,metal);
  }
  for (const side of [-1,1]) {
    const housing=mesh(head,'ear_housing_'+side,cylinder,brass,[side*1.08,.83,-.08],[.365,.22,.365]);housing.rotation.z=Math.PI/2;
    const inset=mesh(head,'ear_insert_'+side,cylinder,metal,[side*1.2,.83,-.08],[.30,.1,.30]);inset.rotation.z=Math.PI/2;
    const cap=mesh(head,'ear_cap_'+side,cylinder,steel,[side*1.26,.83,-.08],[.22,.025,.22]);cap.rotation.z=Math.PI/2;
    const glow=mesh(head,'ear_ring_'+side,ring,trim,[side*1.278,.83,-.08],[.245,.245,.245]);glow.rotation.y=Math.PI/2;
    for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;ball(head,'ear_fastener',side*1.293,.83+Math.cos(a)*.192,-.08+Math.sin(a)*.192,.018,brass);}
    const detail=mesh(head,'ear_inner_ring_'+side,ring,metal,[side*1.292,.83,-.08],[.155,.155,.155]);detail.rotation.y=Math.PI/2;
  }
  mesh(head,'antenna_socket',cylinder,brass,[0,1.70,-.12],[.155,.1,.155]);
  mesh(head,'antenna_stem',cylinder,steel,[0,1.88,-.12],[.046,.31,.046]);
  ball(head,'antenna_tip',0,2.07,-.12,.15,trim);
  ball(head,'antenna_highlight',-.045,2.12,-.015,.032,highlight);
  const eyes:THREE.Group[]=[];
  const brows:THREE.Mesh[]=[];
  for(const side of [-1,1]){
    const eye=new THREE.Group();eye.name=side===-1?'left_eye':'right_eye';eye.position.set(side*.34,.98,.974);head.add(eye);
    mesh(eye,'eye_light',eyeRing,cyan,[0,0,0],[.76,1.2,1]);
    ball(eye,'eye_spark',-.047,.103,.024,.035,highlight);eyes.push(eye);
    brows.push(tube(head,'brow_'+side,[new THREE.Vector3(side*.34-.11,1.31,.974),new THREE.Vector3(side*.34,1.33,.974),new THREE.Vector3(side*.34+.11,1.31,.974)],.018,cyan));
  }
  const smile=new THREE.Group();smile.name='smile';smile.position.set(0,.49,.978);head.add(smile);
  tube(smile,'smile_light',[new THREE.Vector3(-.23,.06,0),new THREE.Vector3(-.12,-.007,0),new THREE.Vector3(0,-.029,0),new THREE.Vector3(.12,-.007,0),new THREE.Vector3(.23,.06,0)],.027,cyan);
  tube(head,'glass_glint',[new THREE.Vector3(-.6,1.22,.973),new THREE.Vector3(-.49,1.3,.973),new THREE.Vector3(-.33,1.3,.973)],.008,steel);

  const paint=(pose:RobotPose)=>{
    const gazeX=pose.gazeX??0,gazeY=pose.gazeY??0;
    head.rotation.set(gazeY*.18,gazeX*.30,-.035);
    arms.forEach(({shoulder,elbow,hand,fingers,side})=>{
      const formalShoulder=-side*.52,formalElbow=-side*.34;
      shoulder.position.z=-.3;shoulder.rotation.set(.48,0,formalShoulder);
      elbow.rotation.set(-.32,0,formalElbow);hand.rotation.set(.16,0,side*-.08);
      if(side===-1){
        shoulder.position.z=-.3+pose.wave*.34;
        shoulder.rotation.x=.48*(1-pose.wave);shoulder.rotation.z=formalShoulder+pose.wave*(-1.55-formalShoulder);
        elbow.rotation.x=-.32*(1-pose.wave);elbow.rotation.z=formalElbow+pose.wave*(-.88-formalElbow);
        hand.rotation.z=-.08+Math.sin(pose.phase)*pose.wave*.20;
      }
      fingers.forEach((finger,index)=>{finger.rotation.x=.3*(1-pose.wave);finger.rotation.z=side*(index-1.5)*pose.wave*.065;});
    });
    eyes.forEach((eye,index)=>{
      eye.scale.y=Math.max(.055,1-pose.blink*.945);
      eye.position.set((index===0?-.34:.34)+gazeX*.085,.98-gazeY*.065,.974);
    });
    brows.forEach(brow=>{brow.position.x=gazeX*.03;brow.position.y=-gazeY*.012;});
    smile.scale.set(1+pose.smile*.15,1+pose.smile*.25,1);
    renderer.render(scene,camera);
  };
  const resize=()=>{
    const r=canvas.getBoundingClientRect(),aspect=r.width/Math.max(r.height,1);
    camera.left=-2.65*aspect;camera.right=2.65*aspect;camera.updateProjectionMatrix();
    renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);
  };
  resize();
  const dispose=()=>{
    const resources=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
    scene.traverse(o=>{if(o instanceof THREE.Mesh){resources.add(o.geometry);const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(material=>materials.add(material));}});
    resources.forEach(resource=>resource.dispose());materials.forEach(material=>material.dispose());
    texture.dispose();relief.dispose();brushing.dispose();shadowTexture.dispose();logoTexture?.dispose();environment.dispose();renderer.dispose();
  };
  return {paint,resize,dispose};
}
