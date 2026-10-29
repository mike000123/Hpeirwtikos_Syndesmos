/* Local, accessible album reader. The catalog is the only content-specific input. */
(()=>{
 'use strict';
 const trigger=document.querySelector('[data-album-open]');
 const dialog=document.querySelector('#album-reader');
 if(!trigger||!dialog)return;
 const $=selector=>dialog.querySelector(selector);
 const viewport=$('.album-viewport'),canvas=$('.album-canvas'),book=$('.album-book'),status=$('[data-album-status]');
 const prev=$('[data-album-prev]'),next=$('[data-album-next]'),indicator=$('[data-album-indicator]');
 const range=$('[data-album-range]'),goTo=$('[data-album-goto]');
 const zoomOut=$('[data-album-zoom-out]'),zoomIn=$('[data-album-zoom-in]'),zoomValue=$('[data-album-zoom-value]');
 const thumbs=$('[data-album-thumbnails]'),toc=$('[data-album-contents]');
 const fullscreen=$('[data-album-fullscreen]');
 const wide=matchMedia('(min-width:801px)');
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 let catalog=null,index=0,zoom=1,version=0,opener=null,controller=null,locked=null;
 let shown=[],turn=null;
 const active=()=>dialog.open;
 const visible=()=>{
  if(!catalog)return[];
  if(!wide.matches||index===0)return[index];
  const start=index%2?index:index-1;
  return[start,start+1].filter(i=>i<catalog.pages.length);
 };
 const setStatus=text=>{status.textContent=text};
 const restoreScroll=()=>{
  if(!locked)return;
  document.documentElement.style.overflow=locked.html;
  document.body.style.overflow=locked.body;
  locked=null;
 };
 const pageSize=pages=>{
  const ratio=catalog.pages[pages[0]].width/catalog.pages[pages[0]].height;
  const style=getComputedStyle(canvas);
  const horizontal=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
  const vertical=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
  const width=Math.max(45,Math.min((viewport.clientWidth-horizontal)/(wide.matches?2:1),(viewport.clientHeight-vertical)*ratio));
  return{width,height:width/ratio};
 };
 const sizePages=()=>{
  if(!active()||!catalog)return;
  if(turn){
   if(turn.width===viewport.clientWidth&&turn.height===viewport.clientHeight)return;
   turn.finish();
  }
  const pages=shown.length?shown:visible();
  const count=pages.length;
  if(!count)return;
  // The closed cover has the same physical page size as an open spread.
  const fitted=pageSize(pages);
  book.querySelectorAll('.album-page').forEach(page=>{
   page.style.width=Math.floor(fitted.width*zoom)+'px';
   page.style.height=Math.floor(fitted.height*zoom)+'px';
  });
  viewport.classList.toggle('is-zoomed',zoom>1);
 };
 const updateControls=()=>{
  const pages=visible();
  const first=pages[0],last=pages[pages.length-1];
  prev.disabled=first===0;next.disabled=last===catalog.pages.length-1;
  const prefix=document.createElement('span');prefix.className='album-indicator-prefix';prefix.textContent=pages.length===2?'Σελίδες ':'Σελίδα ';
  indicator.replaceChildren(prefix,document.createTextNode(`${first+1}${pages.length===2?'–'+(last+1):''} / ${catalog.pages.length}`));
  indicator.setAttribute('aria-label',indicator.textContent);
  range.value=String(index+1);goTo.value=String(index+1);
  range.setAttribute('aria-valuetext',indicator.textContent);
  zoomValue.textContent=Math.round(zoom*100)+'%';
  zoomOut.disabled=zoom<=1;zoomIn.disabled=zoom>=3;
  dialog.querySelectorAll('[data-album-page]').forEach(button=>{
   if(pages.includes(Number(button.dataset.albumPage)))button.setAttribute('aria-current','page');
   else button.removeAttribute('aria-current');
  });
 };
 const loadImage=(img,src)=>new Promise((resolve,reject)=>{
  const done=error=>{clearTimeout(timer);img.onload=null;img.onerror=null;error?reject(error):resolve()};
  const timer=setTimeout(()=>done(new Error('image timeout')),10000);
  img.onload=()=>done();img.onerror=()=>done(new Error('image failed'));img.src=src;
 });
 const preloaded=new Set();
 const preload=()=>{
  if(!catalog)return;
  const around=[];for(let d=-3;d<=3;d++)if(d)around.push(index+d);
  around.filter(i=>i>=0&&i<catalog.pages.length&&!preloaded.has(i)).forEach(i=>{preloaded.add(i);const img=new Image();img.decoding='async';img.src=catalog.pages[i].src});
 };
 const commitPages=(nodes,pages)=>{
  book.replaceChildren(...nodes);
  book.className='album-book'+(pages.length===2?' has-spread':'');
  shown=[...pages];sizePages();preload();
 };
 const clonePaper=(node,className)=>{
  const copy=node?node.cloneNode(true):document.createElement('figure');
  copy.className=className;copy.removeAttribute('style');copy.removeAttribute('aria-label');
  copy.setAttribute('aria-hidden','true');copy.inert=true;
  copy.querySelectorAll('img').forEach(img=>{img.alt='';img.draggable=false});
  return copy;
 };
 // A paper sheet is a continuous cylindrical surface, sampled into narrow strips.
 // Both printed sides share its geometry; the spine stays fixed throughout the bend.
 const bendPaper=(leaf,front,back,width,height,originRight,from,to,timing)=>{
  const animations=[],count=wide.matches?48:32,steps=48;
  const bendSign=originRight?1:-1;
  for(let i=0;i<count;i++){
   // A one-pixel overlap hides subpixel raster seams between curved patches.
   const start=i*width/count,stripWidth=Math.min(width-start,width/count+1);
   const u=(start+stripWidth/2)/width;
   const strip=document.createElement('div');strip.className='album-turn-strip';
   strip.style.width=stripWidth+'px';strip.style.height=height+'px';
   const shades=[];
   [front,back].forEach((node,side)=>{
    const face=document.createElement('div');face.className='album-turn-face '+(side?'album-turn-back':'album-turn-front');
    const paper=clonePaper(node,'album-strip-paper');
    paper.style.width=width+'px';paper.style.height=height+'px';
    paper.style.left=-(side?width-start-stripWidth:start)+'px';
    const shade=document.createElement('span');shade.className='album-strip-shading';
    face.append(paper,shade);strip.append(face);shades.push(shade);
   });
   leaf.append(strip);
   const geometry=[],lighting=[];
   for(let step=0;step<=steps;step++){
    const progress=step/steps;
    const bend=bendSign*1.15*Math.sin(Math.PI*progress);
    const phi=bend*(2*u-1);
    let x=width*u,z=0;
    if(Math.abs(bend)>.00001){
     x=width*(Math.sin(phi)+Math.sin(bend))/(2*bend);
     z=width*(Math.cos(phi)-Math.cos(bend))/(2*bend);
     if(originRight)x+=width-width*Math.sin(bend)/bend;
    }
    geometry.push({offset:progress,transform:`translate3d(${x-stripWidth/2}px,0,${z}px) rotateY(${phi}rad)`});
    const angle=(from+(to-from)*progress)*Math.PI/180+phi;
    lighting.push({offset:progress,opacity:Math.sin(Math.PI*progress)*(.04+.24*Math.abs(Math.sin(angle)))});
   }
   animations.push(strip.animate(geometry,timing));
   shades.forEach(shade=>animations.push(shade.animate(lighting,timing)));
  }
  return animations;
 };
 const turnPages=(nodes,pages,direction,token,drag=false)=>new Promise(resolve=>{
  viewport.classList.add('is-turning');
  const previous=[...book.children];
  const desktop=wide.matches,forward=direction==='next';
  const fitted=pageSize(pages);
  const pageWidth=Math.floor(fitted.width),pageHeight=Math.floor(fitted.height);
  const split=(indices,items)=>indices.length===2?{left:items[0],right:items[1]}:indices[0]===0?{left:null,right:items[0]}:{left:items[0],right:null};
  const old=split(shown,previous),nextPages=split(pages,nodes);
  const base=desktop?(forward?[old.left,nextPages.right]:[nextPages.left,old.right]):[forward?nodes[0]:previous[0]];
  const front=desktop?(forward?old.right:old.left):(forward?previous[0]:nodes[0]);
  const back=desktop?(forward?nextPages.left:nextPages.right):(forward?nodes[0]:previous[0]);
  const slots=base.map(node=>{
   const slot=document.createElement('div');slot.className='album-turn-slot';
   slot.style.width=pageWidth+'px';slot.style.height=pageHeight+'px';
   slot.append(clonePaper(node,'album-turn-static'+(node?'':' album-turn-blank')));return slot;
  });
  const leaf=document.createElement('div');leaf.className='album-turn-leaf';leaf.setAttribute('aria-hidden','true');leaf.inert=true;
  leaf.style.width=pageWidth+'px';leaf.style.height=pageHeight+'px';
  leaf.style.left=desktop&&forward?pageWidth+'px':'0';
  leaf.style.transformOrigin=desktop&&!forward?'right center':'left center';
  const hardCover=[...shown,...pages].some(i=>i===0||i===catalog.pages.length-1);
  leaf.dataset.paper=hardCover?'hard':'flexible';
  if(hardCover)leaf.append(clonePaper(front,'album-turn-face album-turn-front'),clonePaper(back,'album-turn-face album-turn-back'));
  else leaf.classList.add('is-flexible');
  const shadow=document.createElement('div');shadow.className='album-turn-shadow';shadow.setAttribute('aria-hidden','true');
  book.className='album-book is-turning'+(desktop?' has-spread':'');
  book.replaceChildren(...slots,shadow,leaf);viewport.classList.add('is-turning');
  const duration=desktop?900:950;
  const timing={duration,easing:drag?'linear':desktop?'cubic-bezier(.35,.08,.3,1)':'cubic-bezier(.45,0,.55,1)',fill:'both'};
  const from=desktop?0:forward?0:-180;
  const to=desktop?(forward?-180:180):forward?-180:0;
  const motion=leaf.animate([{transform:`rotateY(${from}deg)`},{transform:`rotateY(${to}deg)`}],timing);
  const animations=[motion];
  if(!hardCover)animations.push(...bendPaper(leaf,front,back,pageWidth,pageHeight,desktop&&!forward,from,to,timing));
  // Opening and closing the cover shifts the book around its spine, without a jump.
  if(desktop){
   const oldOffset=shown.length===1?(shown[0]===0?-pageWidth/2:pageWidth/2):0;
   const newOffset=pages.length===1?(pages[0]===0?-pageWidth/2:pageWidth/2):0;
   if(oldOffset||newOffset)animations.push(book.animate([{transform:`translateX(${oldOffset}px)`},{transform:`translateX(${newOffset}px)`}],timing));
  }
  const sign=forward?1:-1;
  animations.push(shadow.animate([
   {opacity:0,transform:`translateX(${sign*25}%) scaleX(.1)`},
   {opacity:.34,transform:'translateX(0) scaleX(.85)',offset:.5},
   {opacity:0,transform:`translateX(${-sign*25}%) scaleX(.1)`}
  ],timing));
  if(hardCover)leaf.querySelectorAll('.album-turn-face').forEach(face=>{
   const shade=document.createElement('span');shade.className='album-leaf-shading';face.append(shade);
   animations.push(shade.animate([{opacity:0},{opacity:.42,offset:.5},{opacity:0}],timing));
  });
  let finished=false,timer,outcome=null,progress=0;
  const finish=commit=>{
   if(finished)return;finished=true;clearTimeout(timer);
   const keep=typeof commit==='boolean'?commit:outcome?outcome==='commit':!drag;
   animations.forEach(animation=>animation.cancel());
   leaf.remove();shadow.remove();viewport.classList.remove('is-turning');turn=null;
   if(token===version&&active()){
    if(keep)commitPages(nodes,pages);else commitPages(previous,[...shown]);
   }
   resolve();
  };
  turn={finish,drag,width:viewport.clientWidth,height:viewport.clientHeight,
   // Follow the finger: progress 0..1 maps linearly onto the whole page-turn.
   setProgress(value){progress=Math.max(0,Math.min(1,value));animations.forEach(a=>{a.currentTime=progress*duration})},
   get progress(){return progress},
   // Let go: finish the turn or lay the page back down from where it is.
   release(commit){
    if(finished||outcome)return;outcome=commit?'commit':'restore';
    const rate=commit?1.5:-1.5;
    animations.forEach(a=>{a.playbackRate=rate;a.play()});
    motion.onfinish=()=>finish();
    timer=setTimeout(finish,(commit?1-progress:progress)*duration/1.5+250);
   }};
  if(drag){animations.forEach(a=>a.pause());turn.setProgress(0)}
  else{motion.finished.then(()=>finish(),()=>finish());timer=setTimeout(()=>finish(),duration+250)}
 });
 const buildPages=(pages,token,nodes=[])=>{
  return pages.map(i=>{
   const data=catalog.pages[i],figure=document.createElement('figure'),img=document.createElement('img');
   figure.className='album-page';figure.setAttribute('aria-label',`${i+1}. ${data.title}`);
   img.alt=data.alt;img.width=data.width;img.height=data.height;img.draggable=false;
   figure.append(img);nodes.push(figure);
   return loadImage(img,data.src).catch(()=>{
    if(token!==version||!active())return;
    const error=document.createElement('div');error.className='album-page-error';
    const text=document.createElement('p');text.textContent='Η σελίδα δεν μπόρεσε να εμφανιστεί.';
    const retry=document.createElement('button');retry.type='button';retry.className='album-icon-button';retry.textContent='Δοκιμή ξανά';
    retry.addEventListener('click',()=>render());error.append(text,retry);figure.replaceChildren(error);
    throw new Error('page unavailable');
   });
  });
 };
 const render=async(direction='')=>{
  if(!active()||!catalog)return;
  turn?.finish();
  const token=++version;
  const pages=visible(),nodes=[];
  viewport.scrollLeft=0;viewport.scrollTop=0;
  const slowStatus=setTimeout(()=>{if(token===version)setStatus('Φόρτωση σελίδων…')},450);viewport.setAttribute('aria-busy','true');
  const results=buildPages(pages,token,nodes);
  updateControls();
  const outcome=await Promise.allSettled(results);
  clearTimeout(slowStatus);
  if(token!==version||!active())return;
  const failed=outcome.some(r=>r.status==='rejected');
  setStatus(failed?'Κάποια σελίδα δεν φόρτωσε. Μπορείτε να δοκιμάσετε ξανά ή να συνεχίσετε.':'');
  const canTurn=direction&&!failed&&!reducedMotion.matches&&zoom===1&&shown.length&&shown.join(',')!==pages.join(',')&&typeof book.animate==='function'&&[...book.children].every(node=>node.querySelector('img')?.naturalWidth);
  if(canTurn)await turnPages(nodes,pages,direction,token);
  else commitPages(nodes,pages);
  if(token===version&&active())viewport.setAttribute('aria-busy','false');
 };
 const navigate=(target,direction='')=>{
  if(!catalog||!Number.isFinite(target))return;
  const previous=index;
  index=Math.max(0,Math.min(catalog.pages.length-1,target));zoom=1;
  render(direction||(index>previous?'next':index<previous?'prev':''));
 };
 const move=direction=>{
  if(!catalog)return;
  const pages=visible();
  if(direction>0){if(!next.disabled)navigate(pages[pages.length-1]+1,'next')}
  else if(!prev.disabled)navigate(Math.max(0,pages[0]-(wide.matches?2:1)),'prev');
 };
 const populatePanels=()=>{
  thumbs.replaceChildren();toc.replaceChildren();
  catalog.pages.forEach((page,i)=>{
   const item=document.createElement('li'),button=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');
   button.type='button';button.className='album-thumbnail';button.dataset.albumPage=String(i);
   button.setAttribute('aria-label',`Σελίδα ${i+1}: ${page.title}`);
   img.src=page.src;img.alt='';img.width=58;img.height=80;img.loading='lazy';label.textContent=String(i+1);
   button.append(img,label);button.addEventListener('click',()=>navigate(i));item.append(button);thumbs.append(item);
  });
  catalog.contents.forEach(entry=>{
   const item=document.createElement('li'),button=document.createElement('button');
   button.type='button';button.textContent=entry.title+' · '+(entry.page+1);
   button.addEventListener('click',()=>{togglePanel('contents',false);requestAnimationFrame(()=>navigate(entry.page));viewport.focus()});
   item.append(button);toc.append(item);
  });
 };
 const togglePanel=(name,force)=>{
  const panel=$(`[data-album-panel="${name}"]`),button=$(`[data-album-toggle="${name}"]`);
  const open=force===undefined?panel.hidden:force;
  dialog.querySelectorAll('[data-album-panel]').forEach(other=>{other.hidden=true});
  dialog.querySelectorAll('[data-album-toggle]').forEach(other=>{other.setAttribute('aria-expanded','false')});
  panel.hidden=!open;button.setAttribute('aria-expanded',String(open));
  if(!open&&panel.contains(document.activeElement))button.focus({preventScroll:true});
  requestAnimationFrame(sizePages);
 };
 const validate=data=>{
  if(!Array.isArray(data.pages)||!data.pages.length||!Array.isArray(data.contents))throw new Error('Invalid catalog');
  data.pages.forEach(page=>{
   if(typeof page.src!=='string'||!page.src.startsWith('assets/album/')||!(page.width>0&&page.height>0)||typeof page.title!=='string'||typeof page.alt!=='string')throw new Error('Invalid page');
  });
  data.contents.forEach(entry=>{if(!Number.isInteger(entry.page)||entry.page<0||entry.page>=data.pages.length)throw new Error('Invalid contents')});
  return data;
 };
 const fetchCatalog=async()=>{
  controller?.abort();
  const attempt=++version;
  const request=new AbortController();controller=request;
  const timer=setTimeout(()=>request.abort(),8000);
  try{
   const response=await fetch(trigger.dataset.albumCatalog,{signal:request.signal});
   if(!response.ok)throw new Error('Catalog unavailable');
   const data=validate(await response.json());
   if(!active()||attempt!==version)return;
   catalog=data;
   range.max=String(data.pages.length);goTo.max=String(data.pages.length);
   populatePanels();$('[data-album-failure]').hidden=true;viewport.hidden=false;
   $('[data-album-tools]').hidden=false;$('[data-album-seek]').hidden=false;$('[data-album-panel-tools]').hidden=false;
   navigate(index);
  }catch(error){
   if(!active()||attempt!==version)return;
   viewport.hidden=true;$('[data-album-failure]').hidden=false;
   $('[data-album-tools]').hidden=true;$('[data-album-seek]').hidden=true;$('[data-album-panel-tools]').hidden=true;
   setStatus('Η προβολή δεν μπόρεσε να φορτώσει.');
  }finally{clearTimeout(timer);if(controller===request)controller=null}
 };
 const open=()=>{
  if(active())return;
  opener=document.activeElement;
  dialog.showModal();
  locked={html:document.documentElement.style.overflow,body:document.body.style.overflow};
  document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden';
  $('[data-album-close]').focus();
  if(catalog)render();else{setStatus('Φόρτωση λευκώματος…');fetchCatalog()}
 };
 const cleanup=()=>{
  if(!locked)return;
  turn?.finish();shown=[];book.replaceChildren();
  ++version;controller?.abort();controller=null;
  if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
  dialog.classList.remove('album-maximized');fullscreen.setAttribute('aria-pressed','false');fullscreen.setAttribute('aria-label','Πλήρης οθόνη');
  dialog.querySelectorAll('[data-album-panel]').forEach(panel=>{panel.hidden=true});
  dialog.querySelectorAll('[data-album-toggle]').forEach(button=>{button.setAttribute('aria-expanded','false')});
  restoreScroll();opener?.focus({preventScroll:true});
 };
 const close=()=>{dialog.close();cleanup()};
 trigger.addEventListener('click',open);
 $('[data-album-close]').addEventListener('click',close);
 dialog.addEventListener('close',()=>{if(!active())cleanup()});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 let backdropDown=false;
 dialog.addEventListener('pointerdown',event=>{backdropDown=event.target===dialog});
 dialog.addEventListener('click',event=>{if(backdropDown&&event.target===dialog)close();backdropDown=false});
 dialog.addEventListener('pointerdown',event=>{
  if(event.target.closest('.album-reader-footer'))return;
  const panel=dialog.querySelector('[data-album-panel]:not([hidden])');
  if(panel)togglePanel(panel.dataset.albumPanel,false);
 });
 prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 const setZoom=value=>{
  if(!catalog)return;turn?.finish();zoom=Math.max(1,Math.min(3,value));updateControls();sizePages();
  if(zoom===1){viewport.scrollLeft=0;viewport.scrollTop=0}
 };
 zoomOut.addEventListener('click',()=>setZoom(zoom-.25));zoomIn.addEventListener('click',()=>setZoom(zoom+.25));
 $('[data-album-fit]').addEventListener('click',()=>setZoom(1));
 range.addEventListener('input',()=>navigate(Number(range.value)-1));
 goTo.addEventListener('change',()=>{if(goTo.value!=='')navigate(Number(goTo.value)-1);else updateControls()});
 goTo.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(goTo.value!=='')navigate(Number(goTo.value)-1)}});
 dialog.querySelectorAll('[data-album-toggle]').forEach(button=>button.addEventListener('click',()=>togglePanel(button.dataset.albumToggle)));
 $('[data-album-retry]').addEventListener('click',()=>{setStatus('Φόρτωση λευκώματος…');fetchCatalog()});
 fullscreen.addEventListener('click',async()=>{
  if(document.fullscreenElement===dialog){await document.exitFullscreen().catch(()=>{});return}
  if(dialog.classList.contains('album-maximized')){dialog.classList.remove('album-maximized');fullscreen.setAttribute('aria-pressed','false');fullscreen.setAttribute('aria-label','Πλήρης οθόνη');sizePages();return}
  try{
   if(!dialog.requestFullscreen)throw new Error('unsupported');
   await dialog.requestFullscreen();
  }catch(error){dialog.classList.add('album-maximized');fullscreen.setAttribute('aria-pressed','true');fullscreen.setAttribute('aria-label','Έξοδος από την πλήρη οθόνη');sizePages()}
 });
 document.addEventListener('fullscreenchange',()=>{
  fullscreen.setAttribute('aria-pressed',String(document.fullscreenElement===dialog));
  fullscreen.setAttribute('aria-label',document.fullscreenElement===dialog?'Έξοδος από την πλήρη οθόνη':'Πλήρης οθόνη');
  requestAnimationFrame(sizePages);
 });
 dialog.addEventListener('keydown',event=>{
  if(event.key==='Tab'){
   const focusable=[...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(node=>node.getClientRects().length);
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
   return;
  }
  if(event.key==='Escape'&&dialog.classList.contains('album-maximized')){event.preventDefault();dialog.classList.remove('album-maximized');fullscreen.setAttribute('aria-pressed','false');fullscreen.setAttribute('aria-label','Πλήρης οθόνη');sizePages();return}
  if(event.target.matches('input,textarea,select')||event.altKey||event.ctrlKey||event.metaKey)return;
  if(['ArrowLeft','ArrowRight','Home','End','+','=','-'].includes(event.key))event.preventDefault();
  if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1);
  if(event.key==='Home')navigate(0);if(event.key==='End'&&catalog)navigate(catalog.pages.length-1);
  if(event.key==='+'||event.key==='=')setZoom(zoom+.25);if(event.key==='-')setZoom(zoom-.25);
 });
// Dragging turns the page under the finger; letting go finishes or cancels the turn.
 let gesture=null;
 const targetFor=dir=>{
  const pages=visible();
  if(dir==='next')return pages[pages.length-1]+1<catalog.pages.length?pages[pages.length-1]+1:null;
  return pages[0]>0?Math.max(0,pages[0]-(wide.matches?2:1)):null;
 };
 const dragProgress=(g,x)=>{
  const along=(g.dir==='next'?g.x0-x:x-g.x0);
  return along/g.span;
 };
 const beginDrag=async g=>{
  const target=g.target;
  const prevIndex=index;index=target;const pages=visible();index=prevIndex;
  const token=++version,nodes=[];
  const results=buildPages(pages,token,nodes);
  const outcome=await Promise.allSettled(results);
  if(gesture!==g||token!==version||!active())return;
  if(outcome.some(r=>r.status==='rejected')||reducedMotion.matches||typeof book.animate!=='function'){g.fallback=true;return}
  g.span=Math.max(80,pageSize(pages).width*(wide.matches?1.15:.9));
  g.pages=pages;
  turnPages(nodes,pages,g.dir,token,true);
  g.turn=turn;
  if(!g.turn){g.fallback=true;return}
  g.turn.setProgress(dragProgress(g,g.lastX));
  if(g.released)endDrag(g);
 };
 const endDrag=g=>{
  const t=g.turn;if(!t)return;
  const dt=Math.max(1,g.lastT-g.prevT),vx=(g.lastX-g.prevX)/dt; // px per ms
  const directed=g.dir==='next'?-vx:vx;
  const commit=t.progress>.4||(directed>.45&&t.progress>.03);
  if(commit){index=g.target;zoom=1;updateControls()}
  t.release(commit);gesture=null;
 };
 viewport.addEventListener('pointerdown',event=>{
  if(zoom!==1||!event.isPrimary||!catalog||turn||event.button>0){gesture=null;return}
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,x0:0,dir:null,target:null,turn:null,lastX:event.clientX,prevX:event.clientX,lastT:event.timeStamp,prevT:event.timeStamp,released:false};
  try{viewport.setPointerCapture(event.pointerId)}catch(error){}
 });
 viewport.addEventListener('pointermove',event=>{
  const g=gesture;if(!g||event.pointerId!==g.id)return;
  const dx=event.clientX-g.x,dy=event.clientY-g.y;
  if(!g.dir){
   if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
   if(Math.abs(dy)>Math.abs(dx)){gesture=null;return}
   const dir=dx<0?'next':'prev',target=targetFor(dir);
   if(target===null){gesture=null;return}
   g.dir=dir;g.target=target;g.x0=event.clientX;g.lastX=g.prevX=event.clientX;g.lastT=g.prevT=event.timeStamp;
   beginDrag(g);return;
  }
  if(event.timeStamp-g.lastT>16){g.prevX=g.lastX;g.prevT=g.lastT}
  g.lastX=event.clientX;g.lastT=event.timeStamp;
  g.turn?.setProgress(dragProgress(g,event.clientX));
 });
 const upGesture=event=>{
  const g=gesture;if(!g||event.pointerId!==g.id)return;
  g.released=true;
  if(g.turn){endDrag(g);return}
  if(g.fallback||g.dir){ // images were not ready for a live drag: do the normal animated turn
   gesture=null;if(Math.abs(event.clientX-g.x)>55)move(g.dir==='next'?1:-1);return}
  gesture=null;
 };
 viewport.addEventListener('pointerup',upGesture);
 viewport.addEventListener('pointercancel',event=>{
  const g=gesture;if(!g||event.pointerId!==g.id)return;
  if(g.turn){g.turn.release(false)}
  gesture=null;
 });
 wide.addEventListener('change',()=>{if(active()&&catalog){zoom=1;render()}});
 reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)turn?.finish()});
 new ResizeObserver(sizePages).observe(viewport);
})();
