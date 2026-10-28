/* Local, accessible album reader. The catalog is the only content-specific input. */
(()=>{
 'use strict';
 const trigger=document.querySelector('[data-album-open]');
 const dialog=document.querySelector('#album-reader');
 if(!trigger||!dialog)return;
 const $=selector=>dialog.querySelector(selector);
 const viewport=$('.album-viewport'),book=$('.album-book'),status=$('[data-album-status]');
 const prev=$('[data-album-prev]'),next=$('[data-album-next]'),indicator=$('[data-album-indicator]');
 const range=$('[data-album-range]'),goTo=$('[data-album-goto]');
 const zoomOut=$('[data-album-zoom-out]'),zoomIn=$('[data-album-zoom-in]'),zoomValue=$('[data-album-zoom-value]');
 const thumbs=$('[data-album-thumbnails]'),toc=$('[data-album-contents]');
 const fullscreen=$('[data-album-fullscreen]');
 const wide=matchMedia('(min-width:801px)');
 let catalog=null,index=0,zoom=1,version=0,opener=null,controller=null,locked=null,pointer=null;
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
 const sizePages=()=>{
  if(!active()||!catalog)return;
  const count=visible().length;
  if(!count)return;
  const ratio=catalog.pages[visible()[0]].width/catalog.pages[visible()[0]].height;
  const padding=wide.matches?80:32;
  const fitted=Math.max(45,Math.min((viewport.clientWidth-padding)/count,(viewport.clientHeight-(wide.matches?40:28))*ratio));
  book.querySelectorAll('.album-page').forEach(page=>{
   page.style.width=Math.floor(fitted*zoom)+'px';
   page.style.height=Math.floor(fitted*zoom/ratio)+'px';
  });
  viewport.classList.toggle('is-zoomed',zoom>1);
 };
 const updateControls=()=>{
  const pages=visible();
  const first=pages[0],last=pages[pages.length-1];
  prev.disabled=first===0;next.disabled=last===catalog.pages.length-1;
  indicator.textContent=pages.length===2?`Σελίδες ${first+1}–${last+1} / ${catalog.pages.length}`:`Σελίδα ${first+1} / ${catalog.pages.length}`;
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
 const render=async(direction='')=>{
  if(!active()||!catalog)return;
  const token=++version;
  const pages=visible();book.replaceChildren();
  book.className='album-book'+(pages.length===2?' has-spread':'')+(direction?' turn-'+direction:'');
  viewport.scrollLeft=0;viewport.scrollTop=0;
  setStatus('Φόρτωση σελίδων…');viewport.setAttribute('aria-busy','true');
  const results=pages.map(i=>{
   const data=catalog.pages[i],figure=document.createElement('figure'),img=document.createElement('img');
   figure.className='album-page';figure.setAttribute('aria-label',`${i+1}. ${data.title}`);
   img.alt=data.alt;img.width=data.width;img.height=data.height;img.draggable=false;
   figure.append(img);book.append(figure);
   return loadImage(img,data.src).catch(()=>{
    if(token!==version||!active())return;
    const error=document.createElement('div');error.className='album-page-error';
    const text=document.createElement('p');text.textContent='Η σελίδα δεν μπόρεσε να εμφανιστεί.';
    const retry=document.createElement('button');retry.type='button';retry.className='album-icon-button';retry.textContent='Δοκιμή ξανά';
    retry.addEventListener('click',()=>render());error.append(text,retry);figure.replaceChildren(error);
    throw new Error('page unavailable');
   });
  });
  updateControls();sizePages();
  const outcome=await Promise.allSettled(results);
  if(token!==version||!active())return;
  viewport.setAttribute('aria-busy','false');
  setStatus(outcome.some(r=>r.status==='rejected')?'Κάποια σελίδα δεν φόρτωσε. Μπορείτε να δοκιμάσετε ξανά ή να συνεχίσετε.':'');
 };
 const navigate=(target,direction='')=>{
  if(!catalog||!Number.isFinite(target))return;
  index=Math.max(0,Math.min(catalog.pages.length-1,target));zoom=1;render(direction);
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
   button.addEventListener('click',()=>{navigate(entry.page);togglePanel('contents',false);viewport.focus()});
   item.append(button);toc.append(item);
  });
 };
 const togglePanel=(name,force)=>{
  const panel=$(`[data-album-panel="${name}"]`),button=$(`[data-album-toggle="${name}"]`);
  const open=force===undefined?panel.hidden:force;
  dialog.querySelectorAll('[data-album-panel]').forEach(other=>{other.hidden=true});
  dialog.querySelectorAll('[data-album-toggle]').forEach(other=>{other.setAttribute('aria-expanded','false')});
  panel.hidden=!open;button.setAttribute('aria-expanded',String(open));
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
  ++version;controller?.abort();controller=null;
  if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
  dialog.classList.remove('album-maximized');fullscreen.setAttribute('aria-pressed','false');fullscreen.setAttribute('aria-label','Πλήρης οθόνη');
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
 prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 const setZoom=value=>{
  if(!catalog)return;zoom=Math.max(1,Math.min(3,value));updateControls();sizePages();
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
 viewport.addEventListener('pointerdown',event=>{if(zoom===1&&event.isPrimary)pointer={x:event.clientX,y:event.clientY}});
 viewport.addEventListener('pointercancel',()=>{pointer=null});
 viewport.addEventListener('pointerup',event=>{
  if(!pointer)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
  if(zoom===1&&Math.abs(dx)>65&&Math.abs(dy)<55)move(dx<0?1:-1);
 });
 wide.addEventListener('change',()=>{if(active()&&catalog){zoom=1;render()}});
 new ResizeObserver(sizePages).observe(viewport);
})();
