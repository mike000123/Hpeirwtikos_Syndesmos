/* Native local image links also work without JavaScript. */
(() => {
 const dialog=document.querySelector('.pe-viewer');if(!dialog||typeof dialog.showModal!=='function')return;
 document.documentElement.classList.add('pe-js');
 const links=[...document.querySelectorAll('[data-pe-photo]')],photos=JSON.parse(document.querySelector('#pe-photo-data').textContent);
 const img=dialog.querySelector('.pe-viewer-image'),caption=dialog.querySelector('.pe-viewer-description'),credit=dialog.querySelector('.pe-viewer-credit'),count=dialog.querySelector('.pe-viewer-count'),status=dialog.querySelector('.pe-viewer-status'),title=dialog.querySelector('#pe-viewer-title'),all=dialog.querySelector('.pe-viewer-all');
 const allLabel=document.body.classList.contains('photo-essay-anthropoi')?'Όλες οι εικόνες':'Όλες οι φωτογραφίες';all.textContent=allLabel;
 let selection=[],current=0,origin,overflow='',serial=0;
 const safeLink=(label,url)=>{const a=document.createElement('a');a.textContent=label;if(/^(https?:\/\/|[a-z0-9-]+\.html(?:#|$)|assets\/photo-essays\/[a-z0-9-]+\.webp$)/i.test(url||'')){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}return a;};
 function choose(key,index){selection=photos.map((p,i)=>i).filter(i=>key==='all'||photos[i].group===key);if(!selection.length)return;current=Math.max(0,selection.indexOf(index));title.textContent=key==='all'?allLabel:photos[selection[0]].groupTitle;all.hidden=key==='all';show(current);}
 function show(index){
  current=(index+selection.length)%selection.length;const p=photos[selection[current]],id=++serial;
  caption.textContent=p.caption;count.textContent=`${current+1} / ${selection.length}`;credit.replaceChildren(safeLink(p.author,p.source));if(p.license)credit.append(' · ',safeLink(p.license,p.licenseURL||p.source));if(p.originalFile)credit.append(' · ',safeLink('Αρχική φωτογραφία',p.originalFile));
  img.alt=p.caption;img.src=p.file;status.hidden=false;status.textContent='Φόρτωση εικόνας…';
  img.decode().then(()=>{if(id===serial)status.hidden=true;}).catch(()=>{if(id===serial)status.textContent='Η εικόνα δεν φορτώθηκε. Δοκιμάστε την επόμενη.';});
  for(const n of [-1,1]){const next=new Image();next.src=photos[selection[(current+n+selection.length)%selection.length]].file;}
 }
 function open(key,index,element){origin=element;overflow=document.body.style.overflow;document.body.style.overflow='hidden';choose(key,index);dialog.showModal();dialog.querySelector('.pe-viewer-close').focus();}
 links.forEach(link=>link.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();open(link.dataset.peGroup||'all',Number(link.dataset.pePhoto),link);}));
 document.querySelectorAll('[data-pe-open]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.peOpen,first=key==='all'?0:photos.findIndex(p=>p.group===key);if(first>=0)open(key,first,button);}));
 all.addEventListener('click',()=>choose('all',selection[current]));dialog.querySelector('.pe-viewer-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('.pe-viewer-prev').addEventListener('click',()=>show(current-1));dialog.querySelector('.pe-viewer-next').addEventListener('click',()=>show(current+1));
 dialog.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();show(e.key==='Home'?0:e.key==='End'?selection.length-1:current+(e.key==='ArrowRight'?1:-1));}});
 dialog.addEventListener('close',()=>{document.body.style.overflow=overflow;if(origin&&document.contains(origin))origin.focus({preventScroll:true});});
 let touch;img.addEventListener('touchstart',e=>{touch=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 img.addEventListener('touchend',e=>{if(!touch||!e.changedTouches.length)return;const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)show(current+(dx<0?1:-1));touch=null;},{passive:true});img.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
})();
