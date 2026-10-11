'use strict';
const root=document.documentElement;
const intro=document.getElementById('intro');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const started=performance.now();
const hero=document.querySelector('.hero');
const heroImage=document.querySelector('.hero-day');
function finishIntro(){const delay=Math.max(0,(reduced.matches?150:1800)-(performance.now()-started));setTimeout(()=>{root.classList.add('loaded');setTimeout(()=>{intro.hidden=true},1200)},delay)}
if(heroImage.complete)finishIntro();else{heroImage.addEventListener('load',finishIntro,{once:true});heroImage.addEventListener('error',finishIntro,{once:true})}
let currentScene='day';
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>{currentScene=button.dataset.scene;hero.classList.toggle('night-scene',currentScene==='night');document.querySelectorAll('[data-scene]').forEach(b=>{const active=b.dataset.scene===currentScene;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});document.querySelector('.scene-caption').textContent=currentScene==='night'?'02 / LES LUMIÈRES, LES ÉCHANGES, LA NUIT':'01 / LE SOLEIL, LA TERRASSE, L’OCÉAN'}));
const revealElements=document.querySelectorAll('.reveal');
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}})},{threshold:.08});revealElements.forEach(el=>observer.observe(el))}else revealElements.forEach(el=>el.classList.add('visible'));
const toggle=document.getElementById('menuToggle'),menu=document.getElementById('mobileNav');
function setMenu(open,focusBack=false){toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');menu.hidden=!open;document.body.classList.toggle('menu-open',open);if(open)menu.querySelector('a').focus();else if(focusBack)toggle.focus()}
toggle.addEventListener('click',()=>setMenu(menu.hidden));menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));document.addEventListener('keydown',event=>{if(menu.hidden)return;if(event.key==='Escape')setMenu(false,true);if(event.key==='Tab'){const links=[toggle,...menu.querySelectorAll('a')];const first=links[0],last=links[links.length-1];if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault()}else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault()}}});window.matchMedia('(min-width:601px)').addEventListener('change',e=>{if(e.matches)setMenu(false)});
const motionToggle=document.getElementById('motionToggle');let paused=reduced.matches;
function setMotion(value){paused=value;root.classList.toggle('paused',paused);motionToggle.setAttribute('aria-pressed',String(paused));motionToggle.setAttribute('aria-label',paused?'Reprendre les animations':'Mettre les animations en pause');motionToggle.innerHTML=paused?'▷ <span>Reprendre</span>':'Ⅱ <span>Pause</span>'}
setMotion(paused);motionToggle.addEventListener('click',()=>setMotion(!paused));reduced.addEventListener('change',e=>setMotion(e.matches));
// Explicit same-page navigation also works inside an embedded preview.
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{const hash=link.getAttribute('href');const target=document.getElementById(hash.slice(1));if(!target)return;event.preventDefault();target.scrollIntoView({behavior:paused||reduced.matches?'instant':'smooth',block:'start'});if(location.hash!==hash)history.pushState(null,'',hash)}));
// One animation frame per scroll event; values follow scroll position both ways.
const journey=document.querySelector('.scroll-journey');
const titleTargets=[...document.querySelectorAll('.intro-layout h2,.food-copy h2,.night h2,.moments h2,.contact h2')];
const photoTargets=[...document.querySelectorAll('.food-image img,.night-image img')];
const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
let scrollFrame=0;
function updateScrollChoreography(){
 scrollFrame=0;
 if(paused||reduced.matches)return;
 const vh=window.innerHeight;const mobile=window.innerWidth<601;
 const hr=hero.getBoundingClientRect();const hp=clamp(-hr.top/hr.height);
 hero.style.setProperty('--hero-title-y',`${-hp*(mobile?170:250)}px`);
 hero.style.setProperty('--hero-word-x',`${hp*(mobile?55:140)}px`);
 hero.style.setProperty('--hero-title-opacity',String(clamp(1-hp*1.2,.12,1)));
 hero.style.setProperty('--hero-scale',String(1+hp*.28));
 hero.style.setProperty('--hero-image-y',`${hp*(mobile?70:130)}px`);
 const jr=journey.getBoundingClientRect();const p=clamp(-jr.top/Math.max(1,jr.height-vh));
 const food=clamp((p-.25)/.18),party=clamp((p-.65)/.18);
 journey.style.setProperty('--journey-progress',p.toFixed(4));
 journey.style.setProperty('--journey-inset',`${Math.max(0,5-p*24)}%`);
 journey.style.setProperty('--journey-radius',`${Math.max(0,8-p*40)}px`);
 journey.style.setProperty('--journey-scale',(1.06+p*.28).toFixed(4));
 journey.style.setProperty('--food-opacity',food.toFixed(4));journey.style.setProperty('--party-opacity',party.toFixed(4));
 journey.style.setProperty('--pool-word-opacity',(1-food).toFixed(4));journey.style.setProperty('--food-word-opacity',(food*(1-party)).toFixed(4));journey.style.setProperty('--party-word-opacity',party.toFixed(4));
 journey.style.setProperty('--journey-title-x',`${p*(mobile?16:65)}px`);
 document.querySelectorAll('[data-step]').forEach((step,i)=>step.classList.toggle('active',i===(p<.34?0:p<.74?1:2)));
 titleTargets.forEach((title,i)=>{const rect=title.getBoundingClientRect();const progress=clamp((vh-rect.top)/(vh+rect.height));title.style.setProperty('--title-x',`${(progress-.5)*(mobile?30:85)*(i%2?1:-1)}px`);title.style.setProperty('--title-y',`${(progress-.5)*-45}px`)});
 photoTargets.forEach(photo=>{const rect=photo.parentElement.getBoundingClientRect();const progress=clamp((vh-rect.top)/(vh+rect.height));photo.style.setProperty('--photo-scale',(1+progress*.2).toFixed(4));photo.style.setProperty('--photo-y',`${(progress-.5)*(mobile?24:55)}px`)});
}
function requestScrollFrame(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScrollChoreography)}
window.addEventListener('scroll',requestScrollFrame,{passive:true});window.addEventListener('resize',requestScrollFrame,{passive:true});window.addEventListener('pageshow',requestScrollFrame);motionToggle.addEventListener('click',requestScrollFrame);reduced.addEventListener('change',requestScrollFrame);requestScrollFrame();
