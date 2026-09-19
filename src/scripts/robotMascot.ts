import type { RobotPose, RobotScene } from './robotScene';

/** Global pointer gaze and finite greetings share one on-demand render loop. */
export function initRobotMascot(){
  const dock=document.querySelector<HTMLElement>('[data-whatsapp-dock]');
  const link=dock?.querySelector<HTMLAnchorElement>('.mascot-contact');
  const canvas=dock?.querySelector<HTMLCanvasElement>('canvas');
  if(!dock||!link||!canvas||dock.hasAttribute('data-robot-enhanced'))return;
  dock.setAttribute('data-robot-enhanced','');
  dock.dataset.robotGesture='idle';dock.dataset.robotTracking='idle';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const desktop=matchMedia('(min-width: 48rem)');
  if(!desktop.matches||matchMedia('(hover: none) and (pointer: coarse)').matches)return;
  let scene:RobotScene|null=null,loading=false,unavailable=false,disposed=false,pendingGreeting=false;
  let frame=0,resizeFrame=0,blinkTimer=0,messageTimer=0,lastPaint=0;
  let waveStart:number|null=null,blinkStart:number|null=null;
  const gaze={x:0,y:0,targetX:0,targetY:0};
  const pointer={x:0,y:0,seen:false};
  const origin={x:0,y:0};
  const clamp=(value:number)=>Math.max(-1,Math.min(1,value));
  const keyboardFocused=()=>document.activeElement===link&&link.matches(':focus-visible');
  const allowed=()=>desktop.matches&&!!scene&&!unavailable&&!disposed&&!reduce.matches&&!document.hidden&&!keyboardFocused();
  const moving=()=>Math.abs(gaze.x-gaze.targetX)>.002||Math.abs(gaze.y-gaze.targetY)>.002;
  const measure=()=>{const r=link.getBoundingClientRect();origin.x=r.x+r.width/2;origin.y=r.y+r.height*.31;};
  const target=()=>{gaze.targetX=clamp((pointer.x-origin.x)/Math.max(innerWidth*.65,1));gaze.targetY=clamp((pointer.y-origin.y)/Math.max(innerHeight*.7,1));};
  const ease=(value:number)=>{
    const x=Math.max(0,Math.min(1,value));let lo=0,hi=1;
    for(let i=0;i<12;i++){const u=(lo+hi)/2,v=1-u;const bx=3*v*v*u*.77+3*v*u*u*.175+u*u*u;if(bx<x)lo=u;else hi=u;}
    const u=(lo+hi)/2;return 3*(1-u)*u*u+u*u*u;
  };
  const pose=(now:number):RobotPose=>{
    const elapsed=waveStart===null?0:now-waveStart;
    const strength=waveStart===null?0:ease(elapsed/450)*(1-ease((elapsed-2300)/500));
    const blink=(elapsed:number,at:number)=>{const t=(elapsed-at)/200;return t>=0&&t<=1?Math.sin(t*Math.PI):0;};
    const closing=waveStart!==null?Math.max(blink(elapsed,760),blink(elapsed,1810)):blinkStart===null?0:blink(now-blinkStart,220);
    return {wave:strength,blink:closing,smile:strength,phase:Math.max(0,elapsed-450)/680*Math.PI*2,gazeX:gaze.x,gazeY:gaze.y};
  };
  const scheduleBlink=()=>{
    clearTimeout(blinkTimer);blinkTimer=0;
    if(!allowed()||frame)return;
    blinkTimer=window.setTimeout(()=>{if(!allowed())return;blinkStart=performance.now();dock.dataset.robotGesture='blink';wake();},12000);
  };
  const pause=(paint=true,neutral=false)=>{
    cancelAnimationFrame(frame);frame=0;cancelAnimationFrame(resizeFrame);resizeFrame=0;clearTimeout(blinkTimer);blinkTimer=0;waveStart=blinkStart=null;pendingGreeting=false;
    if(neutral){gaze.x=gaze.y=gaze.targetX=gaze.targetY=0;}
    else {gaze.targetX=gaze.x;gaze.targetY=gaze.y;}
    dock.dataset.robotGesture='idle';dock.dataset.robotTracking='idle';
    if(paint&&scene&&!unavailable&&!document.hidden)scene.paint(pose(performance.now()));
  };
  const tick=(now:number)=>{
    if(!allowed()){pause(false);return;}
    const rate=moving()&&fine.matches?60:30;
    if(now-lastPaint<1000/rate){frame=requestAnimationFrame(tick);return;}
    const delta=lastPaint?Math.min((now-lastPaint)/1000,.08):1/30;
    const damping=1-Math.exp(-delta/ .12);
    gaze.x+=(gaze.targetX-gaze.x)*damping;gaze.y+=(gaze.targetY-gaze.y)*damping;
    if(!moving()){gaze.x=gaze.targetX;gaze.y=gaze.targetY;}
    if(waveStart!==null&&now-waveStart>=2800)waveStart=null;
    if(blinkStart!==null&&now-blinkStart>=650)blinkStart=null;
    dock.dataset.robotGesture=waveStart!==null?'wave':blinkStart!==null?'blink':'idle';
    dock.dataset.robotTracking=moving()?'moving':'idle';
    scene!.paint(pose(now));lastPaint=now;
    if(moving()||waveStart!==null||blinkStart!==null)frame=requestAnimationFrame(tick);
    else {frame=0;scheduleBlink();}
  };
  const wake=()=>{
    if(!allowed()||frame)return;
    clearTimeout(blinkTimer);blinkTimer=0;lastPaint=0;frame=requestAnimationFrame(tick);
  };
  const greet=()=>{
    if(!allowed()||waveStart!==null)return;
    blinkStart=null;waveStart=performance.now();dock.dataset.robotGesture='wave';wake();
  };
  const requestGreeting=()=>{if(scene)greet();else {pendingGreeting=!reduce.matches;void boot();}};
  const clearMessage=()=>{clearTimeout(messageTimer);messageTimer=0;dock.removeAttribute('data-message-open');};
  const showMessage=()=>{
    clearMessage();dock.removeAttribute('data-message-dismissed');dock.setAttribute('data-message-open','');
    messageTimer=window.setTimeout(clearMessage,3200);
  };
  const boot=async()=>{
    if(!desktop.matches||scene||loading||unavailable||disposed||reduce.matches||document.hidden)return;
    loading=true;
    try{
      const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
      if(!context){unavailable=true;dock.dataset.robotState='fallback';return;}
      const {createRobotScene}=await import('./robotScene');
      if(disposed||unavailable)return;
      scene=await createRobotScene(canvas,context,dock.dataset.profileLogo);measure();scene.paint(pose(performance.now()));dock.dataset.robotState='ready';
      if(pointer.seen&&fine.matches&&!reduce.matches){target();wake();}else scheduleBlink();
      if(pendingGreeting){pendingGreeting=false;greet();}
    }catch(error){unavailable=true;dock.dataset.robotState='fallback';dock.dataset.robotError=error instanceof Error?error.message:'scene-load';scene?.dispose();scene=null;}
    finally{loading=false;}
  };
  const timer=0;void boot();
  const follow=(event:PointerEvent)=>{
    if(event.pointerType!=='mouse'||!fine.matches||reduce.matches||document.hidden||disposed||keyboardFocused())return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.seen=true;
    if(!scene||unavailable)return;
    target();if(moving())wake();
  };
  const leave=(event:PointerEvent)=>{if(event.pointerType==='mouse'&&allowed()){gaze.targetX=gaze.targetY=0;if(moving())wake();}};
  const blankClick=(event:MouseEvent)=>{
    if(event.button!==0||event.detail===0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||getSelection()?.toString().trim())return;
    if(!desktop.matches)return;
    const anchor=event.composedPath().find((node):node is HTMLAnchorElement=>node instanceof HTMLAnchorElement);
    if(anchor){
      const destination=new URL(anchor.href,location.href);
      if(anchor.target==='_blank'||destination.origin!==location.origin||destination.pathname!==location.pathname||destination.search!==location.search||!destination.hash)return;
      showMessage();requestGreeting();return;
    }
    if(event.composedPath().some(node=>node instanceof Element&&node.matches('[data-service-return],[data-service-select]'))){showMessage();requestGreeting();return;}
    const controls='a,button,input,textarea,select,label,summary,[role="button"],[role="link"],[role="tab"],[role="menuitem"],[contenteditable]:not([contenteditable="false"])';
    if(event.composedPath().some(node=>node instanceof Element&&node.matches(controls)))return;
    showMessage();requestGreeting();
  };
  const enter=()=>{dock.removeAttribute('data-message-dismissed');if(!scene)void boot();};
  const resetMessage=()=>{dock.removeAttribute('data-message-dismissed');scheduleBlink();};
  const focus=()=>{if(link.matches(':focus-visible')){pause();clearMessage();}};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){pause();clearMessage();dock.setAttribute('data-message-dismissed','');}};
  const preference=()=>{pause(true,true);clearMessage();if(!reduce.matches){if(scene)scheduleBlink();else void boot();}};
  const pointerPreference=()=>{pause(true,true);scheduleBlink();};
  const visibility=()=>{if(document.hidden){pause(false);clearMessage();}else if(scene){scene.resize();measure();scene.paint(pose(performance.now()));scheduleBlink();}else void boot();};
  const resize=()=>{
    if(resizeFrame||!scene||document.hidden||unavailable)return;
    resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;scene?.resize();measure();if(pointer.seen&&fine.matches&&!reduce.matches&&!keyboardFocused())target();scene?.paint(pose(performance.now()));if(moving())wake();});
  };
  const lost=(event:Event)=>{event.preventDefault();unavailable=true;pause(false);dock.dataset.robotState='fallback';scene?.dispose();scene=null;};
  const hide=(event:PageTransitionEvent)=>{
    pause(false);clearMessage();cancelAnimationFrame(resizeFrame);resizeFrame=0;
    if(event.persisted)return;
    disposed=true;clearTimeout(timer);scene?.dispose();scene=null;
    link.removeEventListener('pointerenter',enter);
    link.removeEventListener('pointerleave',resetMessage);link.removeEventListener('blur',resetMessage);link.removeEventListener('focus',focus);
    canvas.removeEventListener('webglcontextlost',lost);document.removeEventListener('keydown',escape);
    document.removeEventListener('pointermove',follow);document.removeEventListener('pointerleave',leave);document.removeEventListener('click',blankClick);
    reduce.removeEventListener('change',preference);fine.removeEventListener('change',pointerPreference);
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);
    window.removeEventListener('pageshow',show);window.removeEventListener('pagehide',hide);
  };
  const show=(event:PageTransitionEvent)=>{if(event.persisted)visibility();};
  link.addEventListener('pointerenter',enter);
  link.addEventListener('pointerleave',resetMessage);link.addEventListener('blur',resetMessage);link.addEventListener('focus',focus);
  canvas.addEventListener('webglcontextlost',lost);document.addEventListener('keydown',escape);
  document.addEventListener('pointermove',follow,{passive:true});document.addEventListener('pointerleave',leave);document.addEventListener('click',blankClick);
  reduce.addEventListener('change',preference);fine.addEventListener('change',pointerPreference);
  document.addEventListener('visibilitychange',visibility);window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
}
