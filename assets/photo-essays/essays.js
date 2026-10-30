/* Native image links remain usable if the photographic viewer is unavailable. */
(() => {
  const dialog=document.querySelector('.pe-viewer');
  if(!dialog || typeof dialog.showModal!=='function') return;
  const links=[...document.querySelectorAll('[data-pe-photo]')];
  const photos=JSON.parse(document.querySelector('#pe-photo-data').textContent);
  const image=dialog.querySelector('.pe-viewer-image');
  const caption=dialog.querySelector('.pe-viewer-description');
  const credit=dialog.querySelector('.pe-viewer-credit');
  const count=dialog.querySelector('.pe-viewer-count');
  const status=dialog.querySelector('.pe-viewer-status');
  let current=0,origin,previousOverflow='',serial=0;
  const safeLink=(label,url) => {
    const a=document.createElement('a');a.textContent=label;
    if(/^(https?:\/\/|[a-z0-9-]+\.html(?:#|$))/i.test(url||'')){a.href=url;a.target='_blank';a.rel='noopener noreferrer';}
    return a;
  };
  const show=index => {
    current=(index+photos.length)%photos.length;
    const p=photos[current],id=++serial;
    caption.textContent=p.caption;count.textContent=`${current+1} / ${photos.length}`;
    credit.replaceChildren(safeLink(p.author,p.source));
    if(p.license){credit.append(' · ',safeLink(p.license,p.licenseURL||p.source));}
    image.alt=p.caption;image.src=p.file;status.hidden=false;status.textContent='Φόρτωση εικόνας…';
    image.decode().then(()=>{if(id===serial)status.hidden=true;}).catch(()=>{
      if(id!==serial)return;
      status.textContent='Η εικόνα δεν φορτώθηκε. Δοκιμάστε την επόμενη φωτογραφία.';
    });
    for(const n of [-1,1]){const preload=new Image();preload.src=photos[(current+n+photos.length)%photos.length].file;}
  };
  links.forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();origin=link;previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';show(Number(link.dataset.pePhoto));dialog.showModal();
    dialog.querySelector('.pe-viewer-close').focus();
  }));
  dialog.querySelector('.pe-viewer-close').addEventListener('click',()=>dialog.close());
  dialog.querySelector('.pe-viewer-prev').addEventListener('click',()=>show(current-1));
  dialog.querySelector('.pe-viewer-next').addEventListener('click',()=>show(current+1));
  dialog.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();
      show(event.key==='Home'?0:event.key==='End'?photos.length-1:current+(event.key==='ArrowRight'?1:-1));
    }
  });
  dialog.addEventListener('close',()=>{
    document.body.style.overflow=previousOverflow;
    if(origin&&document.contains(origin))origin.focus({preventScroll:true});
  });
  let touch;
  image.addEventListener('touchstart',event=>{
    touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;
  },{passive:true});
  image.addEventListener('touchend',event=>{
    if(!touch||!event.changedTouches.length)return;
    const t=event.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)show(current+(dx<0?1:-1));
    touch=null;
  },{passive:true});
  image.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
})();
