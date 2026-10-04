/* ==== JAH deterministic app-cover engine — signature-app-archive ====
   Zero storage, pure client-side SVG. (id, name, tag) -> device-screen cover:
   the app shown running inside a phone frame (or desktop window) with its UI.
   ID hash -> palette (8 palettes) + device + UI layout. Title + ID badge legible.
   SigAppCover.svg({id,name,tag,wide}) -> inline SVG string.
   SigAppCover.thumb({id,name,tag})    -> lazy placeholder <span>.
   SigAppCover.lazy(scopeEl)           -> IntersectionObserver fill for [data-cov]. */
(function(){
"use strict";
function xmur3(str){var h=1779033703^str.length;for(var i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^=h>>>16)>>>0;};}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function wrap(t,n){var w=String(t||"Untitled app").split(/\s+/),L=[],c="",i;for(i=0;i<w.length;i++){if((c+" "+w[i]).trim().length>n){if(c)L.push(c);c=w[i];}else c=(c+" "+w[i]).trim();}if(c)L.push(c);return L.slice(0,2);}
/* [bg,bg2,screen,accent,accent2,ink] */
var PALS=[
 ["#0d1526","#070b14","#12233f","#00f0ff","#9d7bff","#e9f2ff"],
 ["#141020","#0a0714","#1c1530","#c98aff","#ff7ab8","#f4eefb"],
 ["#0f1f14","#070f08","#14301e","#7CFC00","#ffd166","#eef7e6"],
 ["#201410","#0f0906","#302014","#ff9f43","#ff7ab8","#faf3e3"],
 ["#101c22","#070d12","#16303a","#8ad8d8","#00f0ff","#eef7f7"],
 ["#1c1410","#0e0a06","#2c2114","#ffd166","#ff9f43","#fbf6e6"],
 ["#181220","#0b0812","#241a35","#9d7bff","#00f0ff","#efeafd"],
 ["#101418","#070a0d","#1a222b","#ffb300","#ff7a1a","#f2ede2"]
];
function palFor(id){return PALS[xmur3(String(id))()%PALS.length];}
var ICONS=["▤","◉","✎","♪","✉","⚙","◍","⬢","✚","☰","◈","⬣"];
function phoneUI(sx,sy,sw,sh,pal,rnd,name){
  var s="";
  s+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="'+sh+'" rx="6" fill="'+pal[2]+'"/>';
  s+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="26" rx="6" fill="'+pal[3]+'" opacity="0.92"/>';
  s+='<rect x="'+(sx+sw/2-24)+'" y="'+(sy+4)+'" width="48" height="8" rx="4" fill="#0a0e18" opacity="0.55"/>';
  var nm=name.length>16?name.slice(0,16)+"…":name;
  s+='<text x="'+(sx+10)+'" y="'+(sy+46)+'" font-family="Arial,sans-serif" font-weight="bold" font-size="13" fill="'+pal[5]+'">'+esc(nm)+'</text>';
  var k;for(k=0;k<6;k++){var ix=sx+10+(k%3)*((sw-20)/3),iy=sy+58+Math.floor(k/3)*52,iw=(sw-20)/3-8;
    s+='<rect x="'+ix+'" y="'+iy+'" width="'+iw+'" height="44" rx="6" fill="'+pal[3]+'" opacity="'+(0.25+rnd()*0.3)+'"/>';
    s+='<text x="'+(ix+iw/2)+'" y="'+(iy+26)+'" text-anchor="middle" font-size="17" fill="'+pal[4]+'">'+ICONS[rnd()%ICONS.length]+'</text>';}
  s+='<rect x="'+sx+'" y="'+(sy+sh-24)+'" width="'+sw+'" height="24" rx="6" fill="'+pal[3]+'" opacity="0.35"/>';
  for(k=0;k<3;k++){s+='<circle cx="'+(sx+sw/2-24+k*24)+'" cy="'+(sy+sh-12)+'" r="6" fill="'+pal[4]+'" opacity="'+(k===1?1:0.5)+'"/>';}
  return s;
}
function deskUI(sx,sy,sw,sh,pal,rnd,name){
  var s="";
  s+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="'+sh+'" rx="6" fill="'+pal[2]+'"/>';
  s+='<rect x="'+sx+'" y="'+sy+'" width="'+sw+'" height="24" rx="6" fill="'+pal[3]+'" opacity="0.92"/>';
  s+='<circle cx="'+(sx+14)+'" cy="'+(sy+12)+'" r="4.5" fill="#ff5f57"/><circle cx="'+(sx+30)+'" cy="'+(sy+12)+'" r="4.5" fill="#febc2e"/><circle cx="'+(sx+46)+'" cy="'+(sy+12)+'" r="4.5" fill="#28c840"/>';
  var nm=name.length>22?name.slice(0,22)+"…":name;
  s+='<text x="'+(sx+60)+'" y="'+(sy+16)+'" font-family="Arial,sans-serif" font-weight="bold" font-size="11.5" fill="#0a0e18">'+esc(nm)+'</text>';
  s+='<rect x="'+sx+'" y="'+(sy+24)+'" width="64" height="'+(sh-24)+'" rx="4" fill="'+pal[3]+'" opacity="0.22"/>';
  var k;for(k=0;k<5;k++){s+='<rect x="'+(sx+10)+'" y="'+(sy+34+k*22)+'" width="44" height="12" rx="3" fill="'+pal[3]+'" opacity="'+(k===rnd()%5?0.95:0.4)+'"/>';}
  var cx=sx+76;
  if(rnd()%2){var i;for(i=0;i<7;i++){var hh=14+rnd()%(sh-90);s+='<rect x="'+(cx+i*((sw-90)/7))+'" y="'+(sy+sh-24-hh)+'" width="'+(((sw-90)/7)-6)+'" height="'+hh+'" rx="3" fill="'+(i%2?pal[4]:pal[3])+'" opacity="0.8"/>';}}
  else{for(var j=0;j<4;j++){s+='<rect x="'+cx+'" y="'+(sy+40+j*30)+'" width="'+((sw-100)*(0.5+rnd()*0.45))+'" height="9" rx="4" fill="'+pal[4]+'" opacity="'+(0.35+rnd()*0.35)+'"/>';}
    s+='<rect x="'+cx+'" y="'+(sy+sh-40)+'" width="96" height="20" rx="10" fill="'+pal[3]+'"/><text x="'+(cx+48)+'" y="'+(sy+sh-26)+'" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="11" fill="#0a0e18">OPEN</text>';}
  return s;
}
function svg(o){
  o=o||{};var id=String(o.id||"?"),name=o.name||"Untitled app";
  var pal=palFor(id),h=xmur3(id+"::cov")(),rnd=xmur3(id+"::ui");
  var W=260,H=o.wide?300:300;
  var s='<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Device-screen cover art for '+esc(name)+'">';
  s+='<defs><linearGradient id="abg'+(h%999983)+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+pal[0]+'"/><stop offset="1" stop-color="'+pal[1]+'"/></linearGradient></defs>';
  s+='<rect width="'+W+'" height="'+H+'" fill="url(#abg'+(h%999983)+')"/>';
  var lines=wrap(name,20),ty=28;
  lines.forEach(function(ln,i){s+='<text x="'+(W/2)+'" y="'+(ty+i*22)+'" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="19" fill="'+pal[5]+'">'+esc(ln)+'</text>';});
  var isPhone=(h%10)<7,dx=42,dy=66,dw=W-84,dh=H-132;
  if(isPhone){
    s+='<ellipse cx="'+(W/2)+'" cy="'+(dy+dh+16)+'" rx="'+(dw*0.4)+'" ry="7" fill="#000" opacity="0.5"/>';
    s+='<rect x="'+dx+'" y="'+dy+'" width="'+dw+'" height="'+dh+'" rx="18" fill="#05070c" stroke="'+pal[3]+'" stroke-width="2.5"/>';
    s+=phoneUI(dx+9,dy+9,dw-18,dh-18,pal,rnd,name);
    s+='<rect x="'+(W/2-26)+'" y="'+(dy+dh+4)+'" width="52" height="6" rx="3" fill="'+pal[3]+'" opacity="0.5"/>';
  }else{
    s+='<ellipse cx="'+(W/2)+'" cy="'+(dy+dh+30)+'" rx="'+(dw*0.3)+'" ry="7" fill="#000" opacity="0.5"/>';
    s+='<rect x="'+(W/2-10)+'" y="'+(dy+dh)+'" width="20" height="18" fill="#05070c"/>';
    s+='<rect x="'+(W/2-52)+'" y="'+(dy+dh+16)+'" width="104" height="8" rx="4" fill="#05070c" stroke="'+pal[3]+'" stroke-width="1"/>';
    s+='<rect x="'+dx+'" y="'+dy+'" width="'+dw+'" height="'+dh+'" rx="10" fill="#05070c" stroke="'+pal[3]+'" stroke-width="2.5"/>';
    s+=deskUI(dx+8,dy+8,dw-16,dh-16,pal,rnd,name);
  }
  var idt=id.length>24?id.slice(0,24)+"…":id,bw=8+idt.length*8.2;
  s+='<rect x="10" y="'+(H-32)+'" width="'+bw+'" height="23" rx="11.5" fill="#000" opacity="0.62"/>'
    +'<rect x="10" y="'+(H-32)+'" width="'+bw+'" height="23" rx="11.5" fill="none" stroke="'+pal[3]+'" stroke-width="1.2"/>'
    +'<text x="'+(10+bw/2)+'" y="'+(H-16)+'" text-anchor="middle" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12" fill="'+pal[4]+'">'+esc(idt)+'</text>';
  if(o.tag){var tg=String(o.tag).toUpperCase().slice(0,14);
    s+='<text x="'+(W-12)+'" y="'+(H-15)+'" text-anchor="end" font-family="Arial,sans-serif" font-size="11" letter-spacing="1" fill="'+pal[5]+'" opacity="0.75">'+esc(tg)+'</text>';}
  s+='</svg>';return s;
}
function thumb(o){
  return '<span class="covthumb" data-cov="1" data-cov-id="'+esc(o.id||"")+'" data-cov-title="'+esc(o.name||"")+'" data-cov-sub="'+esc(o.tag||"")+'"><span class="covph" aria-hidden="true">▦</span></span>';
}
function fill(el){
  if(!el||el.getAttribute("data-cov-done"))return;
  el.setAttribute("data-cov-done","1");
  try{el.innerHTML=svg({id:el.getAttribute("data-cov-id"),name:el.getAttribute("data-cov-title"),tag:el.getAttribute("data-cov-sub")});}
  catch(e){el.innerHTML='<span class="covph">▦</span>';}
}
function lazy(scope){
  var root=scope||document;
  var els=root.querySelectorAll?root.querySelectorAll('[data-cov="1"]:not([data-cov-done])'):[];
  if(!els.length)return;
  if(typeof IntersectionObserver==="undefined"){for(var i=0;i<els.length;i++)fill(els[i]);return;}
  if(!lazy._io){lazy._io=new IntersectionObserver(function(es){for(var j=0;j<es.length;j++){if(es[j].isIntersecting){fill(es[j].target);lazy._io.unobserve(es[j].target);}}},{rootMargin:"240px"});}
  for(var i=0;i<els.length;i++)lazy._io.observe(els[i]);
}
window.SigAppCover={svg:svg,thumb:thumb,lazy:lazy,fill:fill};
})();
