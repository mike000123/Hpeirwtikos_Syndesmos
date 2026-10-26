const toggle=document.querySelector('.menu-toggle');toggle?.addEventListener('click',()=>{const nav=document.querySelector('.site-links');const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});const search=document.querySelector('#feature-search');search?.addEventListener('input',()=>{const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el');const q=normalize(search.value.trim());let count=0;document.querySelectorAll('.portal-card').forEach(c=>{c.hidden=!normalize(c.textContent).includes(q);if(!c.hidden)count++});document.querySelector('#results').textContent=`${count} αφιερώματα`});
// Each archive collection scrolls independently and wraps at either end.
document.querySelectorAll('[data-carousel]').forEach(carousel=>{
 const track=carousel.querySelector('.carousel-track');
 const move=direction=>{
  const max=track.scrollWidth-track.clientWidth;
  if(max<=1)return;
  const slide=track.querySelector('.archive-slide');
  const step=slide.getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap);
  let left=track.scrollLeft+direction*step;
  if(direction>0&&track.scrollLeft>=max-2)left=0;
  if(direction<0&&track.scrollLeft<=2)left=max;
  track.scrollTo({left:Math.max(0,Math.min(max,left)),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };
 carousel.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',()=>move(Number(button.dataset.direction))));
 track.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
   event.preventDefault();move(event.key==='ArrowRight'?1:-1);
  }
 });
});
