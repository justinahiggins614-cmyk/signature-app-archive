#!/usr/bin/env python3
"""Generate browse.html — the full-archive A-Z browse page for
The Signature App Archive. Run by the 2h drip AFTER build_sitemap.py,
so the stamped count always matches the freshly rebuilt index
(never one run behind).

browse.html carries:
  - the real current app count stamped into raw HTML (stats chips +
    static count line), same data source as index.html
  - 30 category <details> sections, each with A-Z letter <details>
  - the compact JSONL index (data/index.json.gz) lazy-loaded ONLY
    when the visitor opens a category or types in search —
    never all at once
  - per-app deep links to ./?app=JAH-APP-###### with
    "live demo on site / downloadable" badges (every app page
    runs an in-browser demo AND offers downloads for thumbdrive/CD-ROM)
Theme is pulled from index.html (same <style>, same JAH Network nav),
so the look stays identical to the main page.
"""
import datetime, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://justinahiggins614-cmyk.github.io/signature-app-archive/"
TODAY = datetime.date.today().isoformat()
CREATOR = "Justin Addam Higgins"


def hesc(s):
    return str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def pull_index_html():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    nav = re.search(r'<nav class="jahnet".*?</nav>', html, re.S).group(0)
    style = re.search(r'<style>.*?</style>', html, re.S).group(0)
    themescript = re.search(
        r'<script>try\{if\((?:localStorage\.getItem|PS\.get)\("jah-theme"\).*?</script>', html, re.S).group(0)
    return nav, style, themescript


# --- TAB-WAVE (2026-10-04): tab bar + Ask-the-AI, baked into every regenerated browse.html ---
TABBAR_BROWSE = r"""<!-- JAH TAB BAR — Manon's 2026-10-04 order (calculator screenshot as spec).
     Paste right after </header> (or after the hero/title block) on index.html AND on the archive page.
     On index.html: "Front Door" carries class "on". On the archive page: "1 Million Archive" carries "on".
     Replace  with <a class="jtab" href="...">Label</a> items (may be empty). -->
<style>
.jtabbar{display:flex;gap:8px;overflow-x:auto;padding:10px 12px;-webkit-overflow-scrolling:touch;scrollbar-width:thin;border-bottom:1px solid rgba(128,128,128,.25)}
.jtabbar a.jtab{flex:0 0 auto;text-decoration:none;border:1px solid rgba(160,160,160,.45);border-radius:999px;padding:9px 16px;font-size:.92em;color:inherit;background:rgba(127,127,127,.08);white-space:nowrap;font-family:inherit}
.jtabbar a.jtab.on{background:#f5c518;border-color:#f5c518;color:#191919;font-weight:700}
</style>
<nav class="jtabbar" aria-label="Site sections">
<a class="jtab" href="index.html">🏠 Front Door</a>
<a class="jtab on" href="browse.html">📚 1 Million Archive</a>

</nav>
"""
ASKAI_BROWSE = r"""<!-- ASK THE AI — Manon's 2026-10-04 order. Paste on the archive page, directly under the
     search/filter area (or at the top of the archive section if there is no search box).
     It FINDS records by scanning the page's own archive list, and ANSWERS with his real
     Signature Llama (same loader as the phone book). Never fake: if the Llama can't load,
     the found records are still shown honestly. Replace The Signature App Archive and the app archive. -->
<div class="jah-askai" id="jah-askai">
<style>
.jah-askai{border:1px solid rgba(160,160,160,.4);border-radius:12px;padding:14px;margin:14px 0;background:rgba(127,127,127,.06)}
.jah-askai h2{margin:0 0 4px;font-size:1.15em}
.jah-askai .jah-askai-sub{margin:0 0 10px;font-size:.9em;opacity:.85}
.jah-askai .jah-askai-row{display:flex;gap:8px}
.jah-askai input#jah-askai-q{flex:1;min-width:0;padding:10px 12px;border-radius:8px;border:1px solid rgba(160,160,160,.5);font-size:1em;background:#fff;color:#111}
.jah-askai button#jah-askai-go{padding:10px 18px;border-radius:8px;border:1px solid #f5c518;background:#f5c518;color:#191919;font-weight:700;font-size:1em;cursor:pointer}
.jah-askai #jah-askai-out{margin-top:10px;font-size:.95em}
.jah-askai #jah-askai-out ul{margin:6px 0;padding-left:20px}
.jah-askai .jah-askai-ans{border-left:3px solid #f5c518;padding-left:10px;margin-top:8px}
.jah-askai .jah-askai-thinking{opacity:.7;font-style:italic}
</style>
<h2>🤖 Ask the AI</h2>
<p class="jah-askai-sub">Ask about anything in this archive — the AI searches the records and answers.</p>
<div class="jah-askai-row">
<input id="jah-askai-q" type="text" autocomplete="off" placeholder="Ask about this archive…" aria-label="Ask about this archive">
<button id="jah-askai-go" type="button">Ask</button>
</div>
<div id="jah-askai-out" aria-live="polite"></div>
<script>
(function(){
var SITE="The Signature App Archive", DESC="the app archive";
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
/* Real Signature Llama loader — same pattern as the phone book. */
var LLAMA_BASE="https://justinahiggins614-cmyk.github.io/signature-backend/sigllama/";
var LLAMA_VOCAB="vocab2.json", LLAMA_BIN="sigllama-v2.bin";
var net={loading:null,ready:false};
function llamaEnsure(){
  if(net.ready) return Promise.resolve(true);
  if(net.loading) return net.loading;
  net.loading=new Promise(function(resolve){
    function fin(ok){net.ready=!!ok;resolve(net.ready);}
    function boot(){try{
      if(typeof SigLlama==="undefined"){fin(false);return;}
      SigLlama.load(LLAMA_BASE,LLAMA_VOCAB,LLAMA_BIN).then(function(){fin(true);},function(){fin(false);});
    }catch(e){fin(false);}}
    if(typeof SigLlama!=="undefined"){boot();return;}
    var s=document.createElement("script");s.src=LLAMA_BASE+"sigllama.js";s.async=true;
    s.onload=boot;s.onerror=function(){fin(false);};document.head.appendChild(s);
  });
  return net.loading;
}
/* FIND: keyword scan over the page's own archive list links. */
function findRecords(q){
  var words=String(q).toLowerCase().split(/[^a-z0-9]+/).filter(function(w){return w.length>2;});
  if(!words.length) return [];
  var scope=document.getElementById("jah-askai-scope")||document.querySelector("main")||document.body;
  var links=scope.getElementsByTagName("a"),out=[],seen={};
  for(var i=0;i<links.length;i++){
    var a=links[i];
    if(a.closest("nav")||a.closest("header")||a.closest("footer")||a.closest(".jah-askai")) continue;
    var t=(a.textContent||"").replace(/\s+/g," ").trim();
    if(t.length<3||t.length>160) continue;
    var tl=t.toLowerCase(),score=0;
    for(var j=0;j<words.length;j++) if(tl.indexOf(words[j])>=0) score++;
    if(score>0&&!seen[a.href]){seen[a.href]=1;out.push({t:t,h:a.href,s:score});}
    if(out.length>=60) break;
  }
  out.sort(function(x,y){return y.s-x.s;});
  return out.slice(0,5);
}
function ask(){
  var q=document.getElementById("jah-askai-q").value.trim();
  var out=document.getElementById("jah-askai-out");
  if(!q){out.innerHTML="<p>Please type a question first.</p>";return;}
  var found=findRecords(q),html="";
  if(found.length){
    html+="<p><b>📎 I found "+found.length+" record"+(found.length>1?"s":"")+" matching your words:</b></p><ul>"+
      found.map(function(f){return '<li><a href="'+esc(f.h)+'">'+esc(f.t)+"</a></li>";}).join("")+"</ul>";
  }else{
    html+="<p>No record titles matched those words — asking the AI anyway.</p>";
  }
  html+='<p class="jah-askai-thinking">🤖 thinking…</p>';
  out.innerHTML=html;
  var think=out.querySelector(".jah-askai-thinking");
  llamaEnsure().then(function(ok){
    if(!ok||typeof SigLlama==="undefined"||!SigLlama.loaded||!SigLlama.loaded()){
      think.textContent="The AI voice could not load right now — the records above are what matched your words.";return;}
    var ctx="You are the "+SITE+" archive helper. "+DESC+".\n"+
      (found.length?("Records matching the question: "+found.map(function(f){return f.t;}).join(" | ")+"\n"):"")+
      "User: "+q.slice(0,300)+"\nHelper (one to three sentences, plain words):";
    var done=false;
    function show(t){
      if(done) return; done=true;
      t=String(t||"").trim().replace(/^Helper\s*:\s*/i,"");
      if(t.length<8||/User\s*:/.test(t)) t="I searched the archive for you — the matching records are listed above.";
      think.outerHTML='<p class="jah-askai-ans">🤖 '+esc(t)+"</p>";
    }
    try{
      SigLlama.generate(ctx,{maxTokens:90,temperature:0.5,topK:40}).then(show,function(){show("");});
      setTimeout(function(){show("");},25000);
    }catch(e){show("");}
  });
}
document.getElementById("jah-askai-go").addEventListener("click",ask);
document.getElementById("jah-askai-q").addEventListener("keydown",function(e){if(e.key==="Enter")ask();});
})();
</script>
</div>
"""
def main():
    nav, style, themescript = pull_index_html()
    feed = json.load(open(os.path.join(ROOT, "apps-catalog.json"), encoding="utf-8"))
    fams = feed["categories"]
    # per-category counts from the real compact index row count
    cat_counts = {}
    with open(os.path.join(ROOT, "data", "manifest.json"), encoding="utf-8") as fh:
        total = json.load(fh).get("count", feed["count"])
    apps = feed.get("apps", [])
    for a in apps:
        cat_counts[a["category_key"]] = cat_counts.get(a["category_key"], 0) + 1
    if not apps or sum(cat_counts.values()) != total:
        # apps-catalog.json feed built in the same run covers every app;
        # fall back to even split if a feed app list is missing
        cat_counts = {f["key"]: total // len(fams) for f in fams}
    per_cat = {f["key"]: cat_counts.get(f["key"], 0) for f in fams}

    count_fmt = "{:,}".format(total)

    # ---- static category cards (crawlable, no JS needed) ----
    cat_details = []
    for f in fams:
        c = per_cat[f["key"]]
        cat_details.append(
            '<details class="cat" data-cat="%s">'
            '<summary>%s <b>%s</b> — <span class="cc">%s apps</span></summary>'
            '<div class="cbody"><p class="note">%s Open the letters below to browse every app.</p>'
            '<div class="caz" aria-label="A to Z letters"></div>'
            '<div class="cletters"></div></div></details>'
            % (hesc(f["key"]), hesc(f["icon"]), hesc(f["name"]),
               "{:,}".format(c), hesc(f["blurb"])))

    html = """<!doctype html>
<html lang="en">
<head>
%THEEME_SCRIPT%
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Browse every app A&ndash;Z &mdash; The Signature App Archive</title>
<meta name="description" content="Browse the full catalog of The Signature App Archive: COUNT_PH Signature apps across CAT_PH categories, A&ndash;Z. Every app runs a live demo right in your browser and downloads for your thumbdrive or CD-ROM.">
<link rel="canonical" href="BROWSE_URL">
<meta property="og:type" content="website">
<meta property="og:title" content="Browse every app A&ndash;Z &mdash; The Signature App Archive">
<meta property="og:description" content="The full A&ndash;Z app catalog of The Signature App Archive: COUNT_PH original Signature-line apps. Every app runs live in your browser and downloads for thumbdrive or CD-ROM.">
<meta property="og:url" content="BROWSE_URL">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"CollectionPage","name":"Browse every app A&ndash;Z","isPartOf":{"@type":"WebSite","name":"The Signature App Archive"},"description":"Full A&ndash;Z catalog of original Signature-line apps by Justin Addam Higgins."}
</script>
%STYLE%
<style>
.baz{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}
.baz button{background:#0d1526;border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:10px 13px;cursor:pointer;min-width:44px;min-height:44px}
.baz button.on{border-color:var(--gold);color:var(--gold)}
details.cat{background:var(--bg2);border:1px solid var(--line);border-radius:12px;margin:12px 0}
details.cat>summary{padding:14px 16px;cursor:pointer;list-style:none;font-size:1.02em}
details.cat>summary::-webkit-details-marker{display:none}
details.cat>summary b{color:var(--gold)}
details.cat>summary .cc{color:var(--dim);font-size:.85em}
details.cat .cbody{padding:0 16px 16px}
.caz{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
.caz button{background:#0a0f22;border:1px solid var(--line);color:var(--cy);border-radius:8px;padding:8px 11px;cursor:pointer;min-width:44px;min-height:44px;font-size:.85em}
details.letter{background:#0a0f22;border:1px solid var(--line);border-radius:10px;margin:8px 0}
details.letter>summary{padding:10px 12px;cursor:pointer;color:var(--cy)}
.applist{list-style:none;margin:0;padding:4px 12px 12px}
.applist li{padding:8px 0;border-bottom:1px solid #1a2440;font-size:.92em}
.applist li:last-child{border-bottom:0}
.applist a{color:#9fc2ff;text-decoration:none}
.applist a:hover{text-decoration:underline}
/* deterministic device-screen covers (js/covers.js) */
.applist li .covthumb{display:inline-block;width:56px;flex:0 0 56px;border-radius:8px;overflow:hidden;background:#0d1526;border:1px solid #1a2440;vertical-align:middle}
.applist li .covthumb svg{display:block;width:100%;height:auto}
.covph{display:flex;align-items:center;justify-content:center;min-height:56px;color:#00f0ff;font-size:1.2em}
.applist .tagl{color:var(--dim);font-size:.82em;display:block}
.badge{display:inline-block;font-size:.66em;font-weight:700;letter-spacing:.05em;padding:2px 8px;border-radius:12px;margin-left:8px;vertical-align:middle}
.badge.demo{border:1px solid var(--cy);color:var(--cy)}
.badge.dl{border:1px solid var(--gold);color:var(--gold)}
.srch{position:sticky;top:0;z-index:60;background:var(--bg);padding:10px 0}
.srch input[type=search]{width:100%;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:#060b1c;color:var(--txt);font-size:1em;min-height:48px}
.sres{margin:10px 0}
.loadmsg{padding:14px;color:var(--dim);font-size:.9em;text-align:center}
.browsehero{padding:34px 0 18px;text-align:center;background:radial-gradient(700px 300px at 50% -40px,#12233f55,transparent)}
.browsehero h1{font-size:1.8em;margin:.2em 0;color:var(--gold)}
.browsehero .sub{color:var(--dim);max-width:760px;margin:0 auto}
.howto{max-width:760px;margin:14px auto;color:var(--dim);font-size:.9em}
.bkbtn{display:inline-block;margin:12px 0}
</style>
</head>
<body>
<div class="wrap">
<header class="browsehero">
<div class="kick">SITE 19 OF 31 &middot; THE JAH NETWORK</div>
<h1>&#128241; Browse every app, A&ndash;Z</h1>
<p class="sub">The full catalog of <b>The Signature App Archive</b> &mdash; every original Signature-line app by <b>Justin Addam Higgins</b>. Pick a category, open a letter, and tap any app for its full page.</p>
<div class="stats" id="stats"><!-- STATS-STAMP-START --><div class="stat"><b>STAMP_COUNT</b><span>apps on file</span></div><div class="stat"><b>STAMP_CATS</b><span>app categories</span></div><div class="stat"><b>1,000,000</b><span>march goal</span></div><!-- STATS-STAMP-END --></div>
<p class="staticcount" id="staticcount">STAMP_STATICCOUNT</p>
</header>
"""+TABBAR_BROWSE+"""
<div class="howto">
<p><b style="color:var(--gold)">How it works:</b> every app page runs a <b style="color:var(--cy)">&#9654; live demo right in your browser</b> and offers <b style="color:var(--gold)">&#11015; downloads</b> &mdash; the single-file app, the Python source, and the thumbdrive / CD-ROM pack. The catalog loads category by category, so this page stays fast on phones.</p>
</div>
<div class="srch">
<input type="search" id="bq" placeholder="Search all apps &mdash; name, tagline, or JAH-APP-&hellip;" aria-label="Search all apps" autocomplete="off">
</div>
<div class="sres" id="sres" aria-live="polite"></div>
"""+ASKAI_BROWSE+"""
<div class="baz" id="baz" aria-label="Browse by first letter"></div>
<div id="jah-askai-scope">
<div id="cats">
CAT_DETAILS
</div>
</div>
<p><a class="btn ghost bkbtn" href="./">&#8592; Back to the archive home</a></p>
</div>
%NAV%
<footer style="border-top:1px solid var(--line);margin-top:30px;padding:20px 0 40px;color:var(--dim);font-size:.82em"><div class="wrap">
<p><b style="color:var(--gold)">The Signature App Archive</b> &mdash; every app an original Signature-line program by <b>Justin Addam Higgins</b>. Demos run live in your browser; downloads pack the app for thumbdrive or CD-ROM.</p>
<p class="note">Machine-readable: <a href="api.json">api.json</a> &middot; <a href="apps-catalog.json">apps-catalog.json</a> &middot; <a href="sitemap.xml">sitemap</a></p>
</div></footer>
<script src="js/covers.js"></script>
<script>
"use strict";
var COUNT=STAMP_COUNT_RAW, CATS=STAMP_CATS_RAW;
/* compact index rows: [id, cat_key, seq, title, blurb] — loaded once, lazily */
var ROWS=null, BYCAT={}, BYID={}, FAMS=CAT_JSON;
var $=function(i){return document.getElementById(i)};
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function stripSig(n){return n.indexOf("Signature ")===0?n.slice(10):n}
function firstLetter(n){var s=stripSig(n);return (s.charAt(0)||"#").toUpperCase()}
function loadIndex(cb){
  if(ROWS){cb(ROWS);return}
  setLoading(true);
  fetch("data/index.json.gz").then(function(r){if(!r.ok)throw new Error("fetch "+r.status);return r.arrayBuffer()})
  .then(function(ab){
    if(typeof DecompressionStream==="function"){
      var ds=new DecompressionStream("gzip");
      var w=ds.writable.getWriter();w.write(ab);w.close();
      return new Response(ds.readable).text();
    }
    throw new Error("gzip not supported");
  })
  .then(function(txt){
    var lines=txt.split("\\n"),rows=[];
    for(var i=0;i<lines.length;i++){var l=lines[i].trim();if(!l)continue;rows.push(JSON.parse(l))}
    ROWS=rows;BYCAT={};BYID={};
    for(var j=0;j<rows.length;j++){var r=rows[j];BYID[r[0]]=r;(BYCAT[r[1]]=BYCAT[r[1]]||[]).push(r)}
    setLoading(false);cb(rows);
  }).catch(function(e){setLoading(false);
    $("sres").innerHTML='<p class="loadmsg">The catalog could not load ('+esc(e.message)+'). Check your connection and try again.</p>'});
}
function setLoading(on){
  var els=document.querySelectorAll("details.cat .cbody .loadmsg");
  for(var i=0;i<els.length;i++)els[i].style.display=on?"block":"none";
  if(on)$("sres").innerHTML='<p class="loadmsg"><span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid var(--line);border-top-color:var(--cy);border-radius:50%"></span> Loading the catalog&hellip;</p>';
  else if($("sres").dataset.loading==="1"){$("sres").innerHTML="";$("sres").dataset.loading="";}
}
function appRow(r){
  var id=r[0],name=r[3],tag=r[4];
  var cov=(window.SigAppCover?SigAppCover.thumb({id:id,name:name,tag:tag}):"");
  return '<li><div style="display:flex;gap:10px;align-items:center">'+cov+'<div style="min-width:0;flex:1"><a href="./?app='+esc(id)+'"><b>'+esc(name)+'</b></a>'+
    '<span class="badge demo">&#9654; LIVE DEMO</span>'+
    '<span class="badge dl">&#11015; DOWNLOAD</span>'+
    '<span class="tagl">'+esc(id)+" &middot; "+esc(tag)+'</span></div></div></li>';
}
function renderCategory(det){
  if(det.dataset.built==="1")return;det.dataset.built="1";
  var key=det.dataset.cat;
  var rows=BYCAT[key]||[];
  var byL={};
  for(var i=0;i<rows.length;i++){var L=firstLetter(rows[i][3]);(byL[L]=byL[L]||[]).push(rows[i])}
  var Ls=Object.keys(byL).sort();
  var caz=det.querySelector(".caz"),box=det.querySelector(".cletters");
  var html="";
  for(var j=0;j<Ls.length;j++){var L=Ls[j];
    html+='<details class="letter" data-l="'+L+'"><summary>'+L+' &mdash; '+byL[L].length+' apps</summary><ul class="applist">';
    var rr=byL[L].sort(function(a,b){return a[3]<b[3]?-1:1});
    for(var k=0;k<rr.length;k++)html+=appRow(rr[k]);
    html+='</ul></details>';
  }
  box.innerHTML=html;
  if(window.SigAppCover)SigAppCover.lazy(box);
  caz.innerHTML=Ls.map(function(L){return '<button data-l="'+L+'">'+L+'</button>'}).join("");
  var btns=caz.querySelectorAll("button");
  for(var b=0;b<btns.length;b++){btns[b].onclick=function(){var l=this.dataset.l;var d=det.querySelector('details.letter[data-l="'+l+'"]');if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"})}}}
}
document.querySelectorAll("details.cat").forEach(function(det){
  det.addEventListener("toggle",function(){if(det.open)loadIndex(function(){renderCategory(det)})});
});
/* A-Z bar: jump to a letter across every category */
(function(){
  var bar=$("baz"),letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  letters.forEach(function(L){
    var b=document.createElement("button");b.textContent=L;
    b.onclick=function(){
      var all=document.querySelectorAll("details.cat");
      loadIndex(function(){
        for(var i=0;i<all.length;i++){var d=all[i];d.open=true;renderCategory(d)}
        var first=null;
        document.querySelectorAll("details.letter").forEach(function(dl){
          if(dl.dataset.l===L){dl.open=true;if(!first)first=dl}
        });
        if(first)first.scrollIntoView({behavior:"smooth",block:"start"});
        else $("sres").innerHTML='<p class="loadmsg">No apps start with &ldquo;'+L+'&rdquo; yet &mdash; new apps join every two hours.</p>';
      });
    };
    bar.appendChild(b);
  });
})();
/* search across everything */
var qt=null;
$("bq").addEventListener("input",function(){
  var q=this.value.trim().toLowerCase();
  clearTimeout(qt);
  if(q.length<2){$("sres").innerHTML="";return}
  qt=setTimeout(function(){
    $("sres").dataset.loading="1";setLoading(true);
    loadIndex(function(){
      var hits=[],exact=null;
      for(var i=0;i<ROWS.length;i++){var r=ROWS[i];
        if(r[0].toLowerCase()===q||r[0].toLowerCase()===("jah-app-"+q)){exact=r;break}
      }
      for(var j=0;j<ROWS.length&&hits.length<60;j++){var rr=ROWS[j];
        var nm=rr[3].toLowerCase(),bl=rr[4].toLowerCase();
        if(rr===exact)continue;
        if(nm.indexOf(q)>-1||bl.indexOf(q)>-1||rr[0].toLowerCase().indexOf(q)>-1)hits.push(rr);
      }
      var h="";
      if(exact)h+='<p class="note">Exact ID match:</p><ul class="applist">'+appRow(exact)+"</ul>";
      if(hits.length)h+='<p class="note">'+hits.length+(hits.length===60?"+":"")+" matching apps:</p>"+'<ul class="applist" style="background:var(--bg2);border:1px solid var(--line);border-radius:10px">'+hits.map(appRow).join("")+"</ul>";
      if(!h)h='<p class="loadmsg">No apps match &ldquo;'+esc(q)+'&rdquo;. Try a category name like "word", "mail", or "game".</p>';
      $("sres").dataset.loading="";$("sres").innerHTML=h;
      if(window.SigAppCover)SigAppCover.lazy($("sres"));
    });
  },300);
});
</script>
</body>
</html>
"""

    html = html.replace("%THEEME_SCRIPT%", themescript)
    html = html.replace("%STYLE%", style)
    html = html.replace("%NAV%", nav)
    html = html.replace("BROWSE_URL", BASE + "browse.html")
    html = html.replace("COUNT_PH", count_fmt).replace("CAT_PH", str(len(fams)))
    html = html.replace("CAT_DETAILS", "\n".join(cat_details))
    fam_json = json.dumps({f["key"]: {"name": f["name"], "icon": f["icon"]} for f in fams})
    html = html.replace("CAT_JSON", fam_json)
    stats_inner = ('<div class="stat"><b>%s</b><span>apps on file</span></div>'
                   '<div class="stat"><b>%d</b><span>app categories</span></div>'
                   '<div class="stat"><b>1,000,000</b><span>march goal</span></div>'
                   % (count_fmt, len(fams)))
    # NOTE: replace STAMP_COUNT_RAW before STAMP_COUNT (prefix overlap)
    html = html.replace("STAMP_COUNT_RAW", str(total)).replace("STAMP_CATS_RAW", str(len(fams)))
    html = html.replace("STAMP_COUNT", count_fmt).replace("STAMP_CATS", str(len(fams)))
    html = html.replace("STAMP_STATICCOUNT",
                        "%s Signature apps on file across %d app categories, as of %s."
                        % (count_fmt, len(fams), TODAY))

    out = os.path.join(ROOT, "browse.html")
    open(out, "w", encoding="utf-8").write(html)
    print("browse.html written: %s apps, %d categories" % (count_fmt, len(fams)))


if __name__ == "__main__":
    main()
