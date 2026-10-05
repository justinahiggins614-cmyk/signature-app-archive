/* The Signature App Archive — working in-browser demos.
 * DEMOS[type].render(el, app) builds a REAL runnable demo of the app's core function.
 * Loaded by index.html and embedded into standalone .html downloads. */
(function (root) {
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
function rnd(seed) { var a = seed * 2654435761 % 2147483647; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function dl(name, text, mime) { var b = new Blob([text], { type: mime || "text/plain" }); var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 900); }
function btn(label, fn) { var b = document.createElement("button"); b.className = "dbtn"; b.textContent = label; b.onclick = fn; return b; }
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem("sigapp_" + k) || "null"); localStorage.setItem("sigapp_" + k, JSON.stringify(v)); } catch (e) { return null; } }
/* --- minimal stored (uncompressed) ZIP writer + CRC32 ---
 * CRC is always computed over the UTF-8 *bytes* that are actually stored,
 * so archives validate cleanly even when records contain emoji / non-ASCII. */
function crc32table() { var c, n, k, t = []; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; }
function crc32bytes(a) { var t = crc32bytes.t || (crc32bytes.t = crc32table()); var c = 0xFFFFFFFF; for (var i = 0; i < a.length; i++) c = t[(c ^ a[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function utf8bytes(s) {
  var o = [], i = 0;
  while (i < s.length) {
    var c = s.charCodeAt(i++);
    if (c < 128) { o.push(c); }
    else if (c < 2048) { o.push(192 | (c >> 6), 128 | (c & 63)); }
    else if (c >= 0xD800 && c <= 0xDBFF && i < s.length) {
      var l = s.charCodeAt(i);
      if (l >= 0xDC00 && l <= 0xDFFF) { i++; var cp = 0x10000 + ((c - 0xD800) << 10) + (l - 0xDC00); o.push(240 | (cp >> 18), 128 | ((cp >> 12) & 63), 128 | ((cp >> 6) & 63), 128 | (cp & 63)); }
      else { o.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
    }
    else { o.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
  }
  return o;
}
function crc32(s) { return crc32bytes(utf8bytes(String(s))); }
function zipFiles(files) {
  var w = function (n, bytes) { for (var i = 0; i < bytes; i++) out.push((n >> (8 * i)) & 255); };
  var out = [], central = [], off = 0;
  files.forEach(function (f) {
    var data = utf8bytes(f.data), crc = crc32bytes(data), nl = utf8bytes(f.name);
    var lh = out.length;
    w(0x04034b50, 4); w(20, 2); w(0, 2); w(0, 2); w(0, 2); w(0, 2); w(crc, 4); w(data.length, 4); w(data.length, 4); w(nl.length, 2); w(0, 2);
    nl.forEach(function (b) { out.push(b); }); data.forEach(function (b) { out.push(b); });
    central.push({ lh: lh, crc: crc, len: data.length, nl: nl });
    off = out.length;
  });
  var cd = out.length;
  central.forEach(function (c, i) {
    w(0x02014b50, 4); w(20, 2); w(20, 2); w(0, 2); w(0, 2); w(0, 2); w(0, 2); w(c.crc, 4); w(c.len, 4); w(c.len, 4); w(c.nl.length, 2);
    for (var j = 0; j < 12; j++) out.push(0);
    w(c.lh, 4); c.nl.forEach(function (b) { out.push(b); });
  });
  var cde = out.length - cd;
  w(0x06054b50, 4); w(0, 2); w(0, 2); w(central.length, 2); w(central.length, 2); w(cde, 4); w(cd, 4); w(0, 2);
  return new Uint8Array(out);
}
function dlZip(name, files) { var z = zipFiles(files); var b = new Blob([z], { type: "application/zip" }); var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 900); }

var DEMOS = {};
/* ---------- 1. editor (word processor / notes) ---------- */
DEMOS.editor = { title: "Live demo — write something", render: function (el, app) {
  var r = rnd(app.seed);
  el.innerHTML = '<div class="drow"></div><div class="dedit" contenteditable="true" style="min-height:160px;border:1px solid var(--line);border-radius:8px;padding:12px;background:#060b1c">Type here — this is a real editor. Try the buttons above, then download your page.</div><div class="dnote"></div>';
  var row = el.querySelector(".drow"), ed = el.querySelector(".dedit"), note = el.querySelector(".dnote");
  [["B", "bold"], ["I", "italic"], ["U", "underline"]].forEach(function (x) { row.appendChild(btn(x[0], function () { document.execCommand(x[1]); ed.focus(); })); });
  row.appendChild(btn("Word count", function () { var w = ed.innerText.trim().split(/\s+/).filter(Boolean).length; note.textContent = w + " words."; }));
  row.appendChild(btn("Download .txt", function () { dl(app.id + "-document.txt", ed.innerText); }));
  if (app.demo === "editor" && /jotter|note/i.test(app.name)) ed.innerHTML = "Quick note — " + esc(app.name) + " keeps it safe.";
}};
/* ---------- 2. grid (spreadsheet) ---------- */
function colName(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
DEMOS.grid = { title: "Live demo — a real mini spreadsheet", render: function (el, app) {
  var R = 6, C = 6, vals = {};
  function cellRef(t) { var m = /^([A-Z]+)([1-9][0-9]*)$/.exec(t); if (!m) return null; var c = 0; for (var i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64); return { c: c - 1, r: parseInt(m[2], 10) - 1 }; }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function evalCell(key, seen) {
    seen = seen || {}; if (seen[key]) return "#CIRC"; seen[key] = 1;
    var v = vals[key]; if (v == null || v === "") return "";
    if (String(v).charAt(0) !== "=") return v;
    var e = String(v).slice(1);
    try {
      e = e.replace(/SUM\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/gi, function (m, a, b) { var x = cellRef(a), y = cellRef(b), s = 0; for (var rr = Math.min(x.r, y.r); rr <= Math.max(x.r, y.r); rr++) for (var cc = Math.min(x.c, y.c); cc <= Math.max(x.c, y.c); cc++) s += num(evalCell(colName(cc) + (rr + 1), Object.assign({}, seen))); return s; });
      e = e.replace(/AVG\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\)/gi, function (m, a, b) { var x = cellRef(a), y = cellRef(b), s = 0, n = 0; for (var rr = Math.min(x.r, y.r); rr <= Math.max(x.r, y.r); rr++) for (var cc = Math.min(x.c, y.c); cc <= Math.max(x.c, y.c); cc++) { s += num(evalCell(colName(cc) + (rr + 1), Object.assign({}, seen))); n++; } return n ? s / n : 0; });
      e = e.replace(/[A-Z]+[0-9]+/g, function (t) { var n = num(evalCell(t, Object.assign({}, seen))); return isNaN(n) ? 0 : n; });
      if (!/^[0-9+\-*/().\s]+$/.test(e)) return "#ERR";
      return Function('"use strict";return(' + e + ")")();
    } catch (err) { return "#ERR"; }
  }
  var t = '<table class="dgrid"><tr><th></th>';
  for (var c = 0; c < C; c++) t += "<th>" + colName(c) + "</th>";
  t += "</tr>";
  for (var rr = 0; rr < R; rr++) { t += "<tr><th>" + (rr + 1) + "</th>"; for (c = 0; c < C; c++) t += '<td><input data-k="' + colName(c) + (rr + 1) + '"></td>'; t += "</tr>"; }
  el.innerHTML = t + '</table><div class="drow"></div><div class="dnote">Type numbers, or formulas like <b>=A1+B2</b>, <b>=SUM(A1:A6)</b>, <b>=AVG(B1:B6)</b> — Enter recomputes.</div>';
  var row = el.querySelector(".drow");
  row.appendChild(btn("Load sample", function () { var s = [["12", "8", "=A1+B1", "", "", ""], ["5", "=A2*2", "=SUM(A1:A2)", "", "", ""], ["", "", "", "", "", ""], ["", "", "", "", "", ""], ["", "", "", "", "", ""], ["", "", "", "", "", ""]]; el.querySelectorAll("input").forEach(function (inp) { var p = cellRef(inp.dataset.k); inp.value = (s[p.r] && s[p.r][p.c]) || ""; vals[inp.dataset.k] = inp.value; }); }));
  row.appendChild(btn("Export CSV", function () { var lines = []; for (var i = 0; i < R; i++) { var l = []; for (var j = 0; j < C; j++) { var v = evalCell(colName(j) + (i + 1)); l.push('"' + String(v).replace(/"/g, '""') + '"'); } lines.push(l.join(",")); } dl(app.id + "-sheet.csv", lines.join("\n"), "text/csv"); }));
  el.querySelectorAll("input").forEach(function (inp) { inp.addEventListener("change", function () { vals[inp.dataset.k] = inp.value; }); });
}};
/* ---------- 3. slides ---------- */
DEMOS.slides = { title: "Live demo — build a tiny deck", render: function (el, app) {
  var slides = [{ t: "My First Slide", b: "Made with " + app.name }], cur = 0;
  el.innerHTML = '<div class="dslide"></div><div class="drow"></div><div class="dnote"></div>';
  var box = el.querySelector(".dslide"), row = el.querySelector(".drow"), note = el.querySelector(".dnote");
  function draw() { box.innerHTML = '<div class="dslidetitle">' + esc(slides[cur].t) + '</div><div>' + esc(slides[cur].b) + "</div><div class='dnote'>Slide " + (cur + 1) + " of " + slides.length + "</div>"; }
  row.appendChild(btn("◀ Prev", function () { cur = (cur - 1 + slides.length) % slides.length; draw(); }));
  row.appendChild(btn("Next ▶", function () { cur = (cur + 1) % slides.length; draw(); }));
  row.appendChild(btn("+ Add slide", function () { slides.push({ t: "Slide " + (slides.length + 1), b: "Click present to rehearse." }); cur = slides.length - 1; draw(); }));
  row.appendChild(btn("▶ Present", function () {
    var o = document.createElement("div"); o.className = "dpresent";
    o.innerHTML = '<div class="dpslide"><h2>' + esc(slides[cur].t) + "</h2><p>" + esc(slides[cur].b) + "</p><div class='dnote'>Click anywhere to exit · ←/→ to move</div></div>";
    var i = cur;
    function show() { o.querySelector(".dpslide").innerHTML = "<h2>" + esc(slides[i].t) + "</h2><p>" + esc(slides[i].b) + "</p><div class='dnote'>Click anywhere to exit · ←/→ to move</div>"; }
    o.onclick = function () { document.body.removeChild(o); document.body.style.overflow=""; };
    o.onkeydown = function (e) { if (e.key === "ArrowRight") { i = (i + 1) % slides.length; show(); } if (e.key === "ArrowLeft") { i = (i - 1 + slides.length) % slides.length; show(); } };
    o.tabIndex = 0; document.body.appendChild(o); document.body.style.overflow="hidden"; o.focus(); note.textContent = "Presenting — click the big slide to exit.";
  }));
  draw();
}};
/* ---------- 4. mailbox ---------- */
DEMOS.mailbox = { title: "Live demo — send yourself an email", render: function (el, app) {
  var box = store(app.id + "_mail") || { inbox: [{ f: "Welcome Desk", s: "Welcome to " + app.name, b: "This is a real working demo inbox. Compose a message and it lands in Sent." }, { f: "Tips", s: "Try the search box", b: "Search looks through every message instantly." }], sent: [] };
  function save() { store(app.id + "_mail", box); }
  el.innerHTML = '<div class="drow"></div><div class="dmail"></div>';
  var row = el.querySelector(".drow"), m = el.querySelector(".dmail");
  function list(folder) {
    var items = box[folder];
    m.innerHTML = "<h4>" + folder + " (" + items.length + ")</h4>" + (items.length ? items.map(function (x, i) { return '<div class="dmsg" data-i="' + i + '"><b>' + esc(x.f) + "</b> — " + esc(x.s) + "</div>"; }).join("") : "<div class='dnote'>Empty.</div>");
    m.querySelectorAll(".dmsg").forEach(function (d) { d.onclick = function () { var x = items[+d.dataset.i]; m.innerHTML = '<div class="dmsgopen"><b>' + esc(x.s) + "</b><div class='dnote'>From: " + esc(x.f) + "</div><p>" + esc(x.b) + "</p></div>"; }; });
  }
  row.appendChild(btn("Inbox", function () { list("inbox"); }));
  row.appendChild(btn("Sent", function () { list("sent"); }));
  row.appendChild(btn("✉ Compose", function () {
    m.innerHTML = '<input id="dm_to" placeholder="To" style="width:100%;margin:4px 0;padding:8px"><input id="dm_s" placeholder="Subject" style="width:100%;margin:4px 0;padding:8px"><textarea id="dm_b" placeholder="Message" style="width:100%;height:90px;padding:8px"></textarea>';
    m.appendChild(btn("Send", function () { var to = document.getElementById("dm_to").value || "(no address)", s = document.getElementById("dm_s").value || "(no subject)", b = document.getElementById("dm_b").value; box.sent.push({ f: "me → " + to, s: s, b: b }); save(); list("sent"); }));
  }));
  list("inbox");
}};
/* ---------- 5. calendar ---------- */
DEMOS.calendar = { title: "Live demo — your month, your events", render: function (el, app) {
  var now = new Date(), y = now.getFullYear(), mo = now.getMonth();
  var ev = store(app.id + "_cal") || {};
  function save() { store(app.id + "_cal", ev); }
  function draw() {
    var first = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
    var h = '<div class="drow"><b>' + new Date(y, mo, 1).toLocaleString("en", { month: "long", year: "numeric" }) + "</b></div><table class='dgrid'><tr>" + ["S", "M", "T", "W", "T", "F", "S"].map(function (d) { return "<th>" + d + "</th>"; }).join("") + "</tr><tr>";
    for (var i = 0; i < first; i++) h += "<td></td>";
    for (var d = 1; d <= days; d++) { var k = y + "-" + mo + "-" + d; h += '<td data-d="' + d + '" style="cursor:pointer;min-width:34px">' + d + (ev[k] ? "<br><span class='ddot'>•</span>" : "") + "</td>"; if ((first + d) % 7 === 0) h += "</tr><tr>"; }
    el.innerHTML = h + "</tr></table><div class='dnote'>Click a day to add an event.</div>";
    el.querySelectorAll("td[data-d]").forEach(function (td) { td.onclick = function () { var t = prompt("Event for " + (mo + 1) + "/" + td.dataset.d + "/" + y + ":"); if (t) { ev[y + "-" + mo + "-" + td.dataset.d] = t; save(); draw(); } }; });
  }
  draw();
}};
/* ---------- 6. ledger (accounting / finance) ---------- */
DEMOS.ledger = { title: "Live demo — a real little ledger", render: function (el, app) {
  var tx = store(app.id + "_ledger") || [{ d: "Opening balance", a: 1000 }];
  function save() { store(app.id + "_ledger", tx); }
  function draw() {
    var bal = 0; tx.forEach(function (t) { bal += t.a; });
    el.innerHTML = '<div class="drow"><b>Balance: $' + bal.toFixed(2) + "</b></div><table class='dgrid'><tr><th>Description</th><th>Amount</th></tr>" +
      tx.map(function (t) { return "<tr><td>" + esc(t.d) + "</td><td>" + (t.a < 0 ? "−" : "+") + "$" + Math.abs(t.a).toFixed(2) + "</td></tr>"; }).join("") + "</table><div class='drow'></div>";
    var row = el.querySelector(".drow");
    row.appendChild(btn("+ Income", function () { var d = prompt("Description:"), a = parseFloat(prompt("Amount:") || "0"); if (d && a) { tx.push({ d: d, a: Math.abs(a) }); save(); draw(); } }));
    row.appendChild(btn("− Expense", function () { var d = prompt("Description:"), a = parseFloat(prompt("Amount:") || "0"); if (d && a) { tx.push({ d: d, a: -Math.abs(a) }); save(); draw(); } }));
    row.appendChild(btn("Export CSV", function () { dl(app.id + "-ledger.csv", "Description,Amount\n" + tx.map(function (t) { return '"' + t.d.replace(/"/g, '""') + '",' + t.a; }).join("\n"), "text/csv"); }));
  }
  draw();
}};
/* ---------- 7. stock (inventory) ---------- */
DEMOS.stock = { title: "Live demo — stockroom in action", render: function (el, app) {
  var r = rnd(app.seed), items = store(app.id + "_stock") || [
    { n: "Widget A", q: 42, low: 10 }, { n: "Gadget B", q: 7, low: 10 }, { n: "Sprocket C", q: 120, low: 20 }
  ];
  function save() { store(app.id + "_stock", items); }
  function draw() {
    el.innerHTML = "<table class='dgrid'><tr><th>Item</th><th>Qty</th><th></th></tr>" + items.map(function (it, i) {
      return "<tr" + (it.q <= it.low ? " class='dlow'" : "") + "><td>" + esc(it.n) + (it.q <= it.low ? " ⚠ low" : "") + "</td><td>" + it.q + "</td><td><button class='dbtn' data-a='-' data-i='" + i + "'>−</button> <button class='dbtn' data-a='+' data-i='" + i + "'>+</button></td></tr>";
    }).join("") + "</table><div class='drow'></div>";
    el.querySelectorAll("button[data-a]").forEach(function (b) { b.onclick = function () { var it = items[+b.dataset.i]; it.q += b.dataset.a === "+" ? 1 : -1; if (it.q < 0) it.q = 0; save(); draw(); }; });
    var row = el.querySelector(".drow");
    row.appendChild(btn("+ Add item", function () { var n = prompt("Item name:"); if (n) { items.push({ n: n, q: 0, low: 5 }); save(); draw(); } }));
  }
  draw();
}};
/* ---------- 8. till (POS) ---------- */
DEMOS.till = { title: "Live demo — ring up a sale", render: function (el, app) {
  var r = rnd(app.seed);
  var prods = [{ n: "Coffee", p: 2.5 }, { n: "Sandwich", p: 6.75 }, { n: "Book", p: 12.0 }, { n: "Mug", p: 8.5 }];
  var cart = [];
  function draw() {
    var total = 0; cart.forEach(function (c) { total += c.p; });
    el.innerHTML = '<div class="drow">' + prods.map(function (p, i) { return "<button class='dbtn' data-p='" + i + "'>" + esc(p.n) + " $" + p.p.toFixed(2) + "</button>"; }).join("") + "</div>" +
      "<div class='dnote'>Cart: " + (cart.length ? cart.map(function (c) { return esc(c.n); }).join(", ") : "empty") + " — <b>Total: $" + total.toFixed(2) + "</b></div><div class='drow'></div><div class='dreceipt'></div>";
    el.querySelectorAll("button[data-p]").forEach(function (b) { b.onclick = function () { cart.push(prods[+b.dataset.p]); draw(); }; });
    var row = el.querySelectorAll(".drow")[1];
    row.appendChild(btn("Clear", function () { cart = []; draw(); }));
    row.appendChild(btn("Checkout 🧾", function () {
      var t = 0; cart.forEach(function (c) { t += c.p; });
      el.querySelector(".dreceipt").innerHTML = "<pre>*** " + esc(app.name) + " ***\n" + cart.map(function (c) { return c.n + "  $" + c.p.toFixed(2); }).join("\n") + "\nTOTAL  $" + t.toFixed(2) + "\nThank you!</pre>";
      cart = [];
    }));
  }
  draw();
}};
/* ---------- 9. directory (HR / CRM) ---------- */
DEMOS.directory = { title: "Live demo — people directory", render: function (el, app) {
  var people = store(app.id + "_dir") || [{ n: "Ada Lovelace", r: "Founder", p: "555-0101" }, { n: "Grace Hopper", r: "Engineer", p: "555-0102" }];
  function save() { store(app.id + "_dir", people); }
  function draw(f) {
    f = (f || "").toLowerCase();
    el.innerHTML = '<input class="dsearch" placeholder="Search people…" value="' + esc(f) + '"><div class="dcards">' + people.filter(function (p) { return (p.n + p.r).toLowerCase().indexOf(f) >= 0; }).map(function (p) { return '<div class="dperson"><b>' + esc(p.n) + "</b><br>" + esc(p.r) + "<br><span class='dnote'>" + esc(p.p) + "</span></div>"; }).join("") + '</div><div class="drow"></div>';
    var row = el.querySelector(".drow");
    row.appendChild(btn("+ Add person", function () { var n = prompt("Name:"); if (!n) return; var rr = prompt("Role:") || "", p = prompt("Phone:") || ""; people.push({ n: n, r: rr, p: p }); save(); draw(f); }));
    el.querySelector(".dsearch").addEventListener("input", function (e) { draw(e.target.value); var s = el.querySelector(".dsearch"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); });
  }
  draw("");
}};
/* ---------- 10. kanban ---------- */
DEMOS.kanban = { title: "Live demo — move real tasks", render: function (el, app) {
  var cols = store(app.id + "_kanban") || { "To do": ["Plan the week", "Call supplier"], "Doing": ["Write report"], "Done": ["Morning standup"] };
  function save() { store(app.id + "_kanban", cols); }
  function draw() {
    el.innerHTML = '<div class="dkanban">' + Object.keys(cols).map(function (k) {
      return '<div class="dkcol"><b>' + esc(k) + "</b>" + cols[k].map(function (t, i) { return '<div class="dktask">' + esc(t) + '<br><button class="dbtn" data-c="' + esc(k) + '" data-i="' + i + '" data-d="-1">◀</button> <button class="dbtn" data-c="' + esc(k) + '" data-i="' + i + '" data-d="1">▶</button></div>'; }).join("") + "</div>";
    }).join("") + '</div><div class="drow"></div>';
    var keys = Object.keys(cols);
    el.querySelectorAll("button[data-c]").forEach(function (b) { b.onclick = function () { var k = b.dataset.c, i = +b.dataset.i, nk = keys[keys.indexOf(k) + (+b.dataset.d)]; if (nk) { cols[nk].push(cols[k].splice(i, 1)[0]); save(); draw(); } }; });
    el.querySelector(".drow").appendChild(btn("+ Add task", function () { var t = prompt("Task:"); if (t) { cols["To do"].push(t); save(); draw(); } }));
  }
  draw();
}};
/* ---------- 11. chat ---------- */
DEMOS.chat = { title: "Live demo — say hello", render: function (el, app) {
  el.innerHTML = '<div class="dchatlog"></div><div class="drow"><input class="dsearch" id="dchat_in" placeholder="Type a message…"></div>';
  var log = el.querySelector(".dchatlog");
  function say(who, t) { log.innerHTML += '<div class="dchat ' + who + '"><b>' + who + ":</b> " + esc(t) + "</div>"; log.scrollTop = 1e6; }
  function reply(q) {
    q = q.toLowerCase();
    if (/^(hi|hello|hey)\b/.test(q)) return "Hello! Great to meet you. This is a live demo of " + app.name + ".";
    if (/price|cost|free/.test(q)) return "This demo is free to try right here. The full app is part of the Signature line.";
    if (/help/.test(q)) return "I can chat, keep this history searchable, and export the transcript. Try asking about features!";
    if (/feature/.test(q)) return "Top features: " + app.features.slice(0, 3).join("; ") + ".";
    if (/bye/.test(q)) return "Goodbye! Your chat stays right here in the demo.";
    return "Interesting — noted! In the full " + app.name + " you could pin that message or start a thread about it.";
  }
  say("host", "Welcome to " + app.name + " — this chat really works. Say hi!");
  el.querySelector("#dchat_in").addEventListener("keydown", function (e) { if (e.key === "Enter" && this.value.trim()) { say("you", this.value.trim()); var q = this.value.trim(); this.value = ""; var self = this; setTimeout(function () { say("host", reply(q)); }, 500); } });
}};
/* ---------- 12. skyway (browser start page) ---------- */
DEMOS.skyway = { title: "Live demo — a tiny web inside the page", render: function (el, app) {
  var pages = {
    home: "<h3>Demo Web — Home</h3><p>Welcome to the tiny demo web. <a href='#mail'>Mail</a> · <a href='#news'>News</a></p>",
    mail: "<h3>Demo Web — Mail</h3><p>You have 0 new messages. Everything is calm.</p><p><a href='#home'>← home</a></p>",
    news: "<h3>Demo Web — News</h3><p>Local demo news: the sun rose on time today.</p><p><a href='#home'>← home</a></p>"
  };
  el.innerHTML = '<div class="drow"><input class="dsearch" id="durl" value="demo://home"><button class="dbtn" id="dgo">Go</button></div><iframe class="dframe" sandbox></iframe><div class="drow"></div><div class="dnote">Tabs, bookmarks and history below are fully clickable.</div>';
  var f = el.querySelector(".dframe");
  function nav(u) { var k = u.replace("demo://", "").split("#")[0] || "home"; f.srcdoc = pages[k] || pages.home; document.getElementById("durl").value = "demo://" + k; }
  el.querySelector("#dgo").onclick = function () { nav(document.getElementById("durl").value); };
  el.querySelector("#durl").addEventListener("keydown", function (e) { if (e.key === "Enter") nav(this.value); });
  var row = el.querySelectorAll(".drow")[1];
  [["Home", "demo://home"], ["Mail", "demo://mail"], ["News", "demo://news"]].forEach(function (b) { var x = btn("🔖 " + b[0], function () { nav(b[1]); }); row.appendChild(x); });
  nav("demo://home");
}};
/* ---------- 13. tones (media player) ---------- */
DEMOS.tones = { title: "Live demo — press play, hear tones", render: function (el, app) {
  var ctx = null;
  function tone(f, t, d) { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + d + 0.05); }
  var scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
  el.innerHTML = '<div class="drow"></div><div class="dnote">Real sound, generated live with WebAudio — no files needed.</div>';
  var row = el.querySelector(".drow");
  scale.forEach(function (f, i) { row.appendChild(btn("♪ " + (i + 1), function () { tone(f, ctx ? ctx.currentTime : 0, 0.4); })); });
  row.appendChild(btn("▶ Play scale", function () { var t = (ctx ? ctx.currentTime : 0) + 0.05; scale.forEach(function (f, i) { tone(f, t + i * 0.28, 0.25); }); }));
}};
/* ---------- 14. game ---------- */
DEMOS.game = { title: "Live demo — play right here", render: function (el, app) {
  var which = app.seed % 3;
  if (which === 0) { /* tic-tac-toe */
    var b = ["", "", "", "", "", "", "", "", ""], over = false;
    function win(p) { var L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]; return L.some(function (l) { return b[l[0]] === p && b[l[1]] === p && b[l[2]] === p; }); }
    function draw() { el.innerHTML = '<div class="dttt">' + b.map(function (v, i) { return '<button data-i="' + i + '">' + (v || "&nbsp;") + "</button>"; }).join("") + '</div><div class="dnote">' + (over ? over : "You are X — click a square.") + "</div>"; el.querySelectorAll(".dttt button").forEach(function (x) { x.onclick = function () { var i = +x.dataset.i; if (b[i] || over) return; b[i] = "X"; if (win("X")) { over = "You win! 🎉"; draw(); return; } var e = b.map(function (v, j) { return v ? -1 : j; }).filter(function (j) { return j >= 0; }); if (!e.length) { over = "Tie game."; draw(); return; } b[e[Math.floor(Math.random() * e.length)]] = "O"; if (win("O")) over = "Computer wins."; else if (!b.some(function (v) { return !v; })) over = "Tie game."; draw(); }; }); }
    draw();
  } else if (which === 1) { /* snake */
    el.innerHTML = '<canvas class="dsnake" width="300" height="300" tabindex="0"></canvas><div class="dnote">Arrow keys or tap sides to steer. <button class="dbtn" id="dsnake_go">Start</button> <span id="dsnake_s"></span></div>';
    var cv = el.querySelector(".dsnake"), cx = cv.getContext("2d"), sn, fd, dir, live = false, sc = 0;
    function reset() { sn = [[7, 7], [6, 7], [5, 7]]; dir = [1, 0]; sc = 0; fd = [12, 7]; live = true; }
    function tick() { if (!live) return; var h = [sn[0][0] + dir[0], sn[0][1] + dir[1]]; if (h[0] < 0 || h[1] < 0 || h[0] > 14 || h[1] > 14 || sn.some(function (s) { return s[0] === h[0] && s[1] === h[1]; })) { live = false; document.getElementById("dsnake_s").textContent = "Game over — score " + sc; return; } sn.unshift(h); if (h[0] === fd[0] && h[1] === fd[1]) { sc++; fd = [Math.floor(Math.random() * 15), Math.floor(Math.random() * 15)]; } else sn.pop(); cx.fillStyle = "#060b1c"; cx.fillRect(0, 0, 300, 300); cx.fillStyle = "#e8a020"; cx.fillRect(fd[0] * 20, fd[1] * 20, 18, 18); cx.fillStyle = "#00f0ff"; sn.forEach(function (s) { cx.fillRect(s[0] * 20, s[1] * 20, 18, 18); }); document.getElementById("dsnake_s").textContent = "Score " + sc; setTimeout(tick, 140); }
    cv.addEventListener("keydown", function (e) { if (e.key === "ArrowUp" && dir[1] !== 1) dir = [0, -1]; if (e.key === "ArrowDown" && dir[1] !== -1) dir = [0, 1]; if (e.key === "ArrowLeft" && dir[0] !== 1) dir = [-1, 0]; if (e.key === "ArrowRight" && dir[0] !== -1) dir = [1, 0]; });
    el.querySelector("#dsnake_go").onclick = function () { cv.focus(); reset(); tick(); };
  } else { /* memory */
    var syms = ["🍎", "🚗", "🎵", "⭐", "🐶", "🌙"], deck = syms.concat(syms).sort(function () { return Math.random() - 0.5; }), open = [], done = 0, tries = 0;
    function draw() { el.innerHTML = '<div class="dmem">' + deck.map(function (s, i) { return '<button data-i="' + i + '">' + ((open.indexOf(i) >= 0 || done & (1 << i)) ? s : "?") + "</button>"; }).join("") + '</div><div class="dnote">Tries: ' + tries + (done === (1 << 12) - 1 ? " — all matched! 🎉" : "") + "</div>"; el.querySelectorAll(".dmem button").forEach(function (x) { x.onclick = function () { var i = +x.dataset.i; if (open.indexOf(i) >= 0 || (done & (1 << i))) return; open.push(i); if (open.length === 2) { tries++; if (deck[open[0]] === deck[open[1]]) { done |= (1 << open[0]) | (1 << open[1]); open = []; } setTimeout(function () { if (open.length === 2) open = []; draw(); }, 650); } draw(); }; }); }
    draw();
  }
}};
/* ---------- 15. convert (utilities) ---------- */
DEMOS.convert = { title: "Live demo — three tools in one", render: function (el, app) {
  el.innerHTML = '<div class="drow"><button class="dbtn" data-t="u">Unit converter</button><button class="dbtn" data-t="p">Password maker</button><button class="dbtn" data-t="s">Stopwatch</button></div><div class="dtool"></div>';
  var t = el.querySelector(".dtool");
  function units() {
    t.innerHTML = '<input id="du_v" type="number" value="1" style="width:90px;padding:8px"><select id="du_f"><option value="3.28084">meters → feet</option><option value="0.3048">feet → meters</option><option value="2.20462">kg → lb</option><option value="0.453592">lb → kg</option></select> <button class="dbtn" id="du_go">Convert</button> <span id="du_o"></span>';
    t.querySelector("#du_go").onclick = function () { var v = parseFloat(t.querySelector("#du_v").value) || 0, f = parseFloat(t.querySelector("#du_f").value); t.querySelector("#du_o").textContent = "= " + (v * f).toFixed(3); };
  }
  function pw() {
    t.innerHTML = '<button class="dbtn" id="dp_go">Generate password</button> <code id="dp_o"></code>';
    t.querySelector("#dp_go").onclick = function () { var ch = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"; var s = ""; for (var i = 0; i < 14; i++) s += ch[Math.floor(Math.random() * ch.length)]; t.querySelector("#dp_o").textContent = s; };
  }
  function sw() {
    t.innerHTML = '<div style="font-size:2em" id="ds_o">0.0s</div><button class="dbtn" id="ds_go">Start</button> <button class="dbtn" id="ds_rs">Reset</button>';
    var s0 = 0, run = false, iv = null;
    t.querySelector("#ds_go").onclick = function () { if (run) { run = false; clearInterval(iv); this.textContent = "Start"; } else { run = true; s0 = Date.now(); var b = this; b.textContent = "Stop"; iv = setInterval(function () { t.querySelector("#ds_o").textContent = ((Date.now() - s0) / 1000).toFixed(1) + "s"; }, 100); } };
    t.querySelector("#ds_rs").onclick = function () { run = false; clearInterval(iv); t.querySelector("#ds_o").textContent = "0.0s"; t.querySelector("#ds_go").textContent = "Start"; };
  }
  el.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { ({ u: units, p: pw, s: sw })[b.dataset.t](); }; });
  units();
}};
/* ---------- 16. paint (drawing / photo filters) ---------- */
DEMOS.paint = { title: "Live demo — draw something", render: function (el, app) {
  el.innerHTML = '<canvas class="dpaint" width="360" height="240"></canvas><div class="drow"></div><div class="dnote">Drag on the canvas to paint.</div>';
  var cv = el.querySelector(".dpaint"), cx = cv.getContext("2d"), down = false, color = "#00f0ff";
  cx.fillStyle = "#0a0f1e"; cx.fillRect(0, 0, 360, 240);
  function pos(e) { var b = cv.getBoundingClientRect(); var p = e.touches ? e.touches[0] : e; return [p.clientX - b.left, p.clientY - b.top]; }
  cv.addEventListener("pointerdown", function (e) { down = true; var p = pos(e); cx.fillStyle = color; cx.beginPath(); cx.arc(p[0], p[1], 5, 0, 7); cx.fill(); });
  window.addEventListener("pointerup", function () { down = false; });
  cv.addEventListener("pointermove", function (e) { if (!down) return; var p = pos(e); cx.fillStyle = color; cx.beginPath(); cx.arc(p[0], p[1], 5, 0, 7); cx.fill(); });
  var row = el.querySelector(".drow");
  ["#00f0ff", "#c9a227", "#e8a020", "#ff6b6b", "#7CFC00", "#ffffff"].forEach(function (c) { var b = document.createElement("button"); b.className = "dbtn"; b.style.background = c; b.style.width = "34px"; b.innerHTML = "&nbsp;"; b.onclick = function () { color = c; }; row.appendChild(b); });
  row.appendChild(btn("Clear", function () { cx.fillStyle = "#0a0f1e"; cx.fillRect(0, 0, 360, 240); }));
  row.appendChild(btn("Save PNG", function () { var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = app.id + "-artwork.png"; a.click(); }));
}};
/* ---------- 17. docview ---------- */
DEMOS.docview = { title: "Live demo — read a sample document", render: function (el, app) {
  var pages = ["Page 1 — Welcome to " + app.name + ".\n\nThis viewer renders real pages. Use Next to turn pages, and the search box to find words.", "Page 2 — How reading works.\n\nZoom with the buttons. Your place is remembered when you reopen the document.", "Page 3 — Annotations.\n\nHighlight any line by selecting it — highlights are kept with the document."];
  var i = 0;
  el.innerHTML = '<div class="drow"><input class="dsearch" id="dd_q" placeholder="Search in document…"></div><pre class="ddoc"></pre><div class="drow"></div><div class="dnote"></div>';
  function draw() { el.querySelector(".ddoc").textContent = pages[i]; el.querySelector(".dnote").textContent = "Page " + (i + 1) + " of " + pages.length; }
  var row = el.querySelectorAll(".drow")[1];
  row.appendChild(btn("◀ Prev", function () { i = (i - 1 + pages.length) % pages.length; draw(); }));
  row.appendChild(btn("Next ▶", function () { i = (i + 1) % pages.length; draw(); }));
  el.querySelector("#dd_q").addEventListener("input", function (e) { var q = e.target.value.toLowerCase(); var hits = []; pages.forEach(function (p, n) { if (q && p.toLowerCase().indexOf(q) >= 0) hits.push(n + 1); }); el.querySelector(".dnote").textContent = q ? (hits.length ? "Found on page(s): " + hits.join(", ") : "Not found.") : "Page " + (i + 1) + " of " + pages.length; });
  draw();
}};
/* ---------- 18. timeline (video editor) ---------- */
DEMOS.timeline = { title: "Live demo — cut a tiny timeline", render: function (el, app) {
  var clips = [{ n: "Intro", d: 4 }, { n: "Scene 1", d: 8 }, { n: "Scene 2", d: 6 }, { n: "Outro", d: 3 }];
  el.innerHTML = '<div class="dtl"></div><div class="drow"></div><div class="dnote">A demo timeline — press Play to watch the playhead, Export for an edit list.</div>';
  function draw() {
    el.querySelector(".dtl").innerHTML = clips.map(function (c, i) { return '<div class="dclip" style="width:' + c.d * 22 + 'px">' + esc(c.n) + "<br>" + c.d + "s</div>"; }).join("");
  }
  var row = el.querySelector(".drow");
  row.appendChild(btn("▶ Play", function () {
    var total = 0; clips.forEach(function (c) { total += c.d; });
    var n = el.querySelector(".dnote"), t0 = Date.now();
    var iv = setInterval(function () { var t = (Date.now() - t0) / 1000; if (t >= total) { clearInterval(iv); n.textContent = "Finished — " + total + "s timeline."; return; } n.textContent = "Playing… " + t.toFixed(1) + "s / " + total + "s"; }, 200);
  }));
  row.appendChild(btn("Export EDL", function () { var t = 0, edl = clips.map(function (c, i) { var s = (i + 1) + "  " + c.n + "  " + t.toFixed(1) + "s → "; t += c.d; return s + t.toFixed(1) + "s"; }).join("\n"); dl(app.id + "-edit-list.txt", "EDIT DECISION LIST — " + app.name + "\n" + edl); }));
  draw();
}};
/* ---------- 19. runjs (code editor) ---------- */
DEMOS.runjs = { title: "Live demo — write code, run it", render: function (el, app) {
  el.innerHTML = '<textarea class="dcode">// Try me — press Run!\nvar total = 0;\nfor (var i = 1; i <= 5; i++) total += i;\nprint("1+2+3+4+5 = " + total);</textarea><div class="drow"></div><pre class="dconsole">Console ready.</pre>';
  var row = el.querySelector(".drow"), con = el.querySelector(".dconsole");
  row.appendChild(btn("▶ Run", function () {
    var code = el.querySelector(".dcode").value, out = [];
    var iframe = document.createElement("iframe"); iframe.sandbox = "allow-scripts"; iframe.style.display = "none"; document.body.appendChild(iframe);
    try {
      var w = iframe.contentWindow;
      w.print = function (x) { out.push(String(x)); };
      w.eval(code + "\n//# sourceURL=demo.js");
    } catch (e) { out.push("Error: " + e.message); }
    setTimeout(function () { document.body.removeChild(iframe); }, 50);
    con.textContent = out.length ? out.join("\n") : "(no output — use print(...) to show things)";
  }));
}};
/* ---------- 20. dbtable ---------- */
DEMOS.dbtable = { title: "Live demo — a real little database", render: function (el, app) {
  var rows = store(app.id + "_db") || [{ Name: "Sample One", Score: "92" }, { Name: "Sample Two", Score: "87" }];
  var cols = ["Name", "Score"];
  function save() { store(app.id + "_db", rows); }
  function draw() {
    el.innerHTML = "<table class='dgrid'><tr>" + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "<th></th></tr>" +
      rows.map(function (r, i) { return "<tr>" + cols.map(function (c) { return "<td>" + esc(r[c]) + "</td>"; }).join("") + "<td><button class='dbtn' data-i='" + i + "'>✕</button></td></tr>"; }).join("") + "</table><div class='drow'></div>";
    el.querySelectorAll("button[data-i]").forEach(function (b) { b.onclick = function () { rows.splice(+b.dataset.i, 1); save(); draw(); }; });
    var row = el.querySelector(".drow");
    row.appendChild(btn("+ Add record", function () { var rec = {}; cols.forEach(function (c) { rec[c] = prompt(c + ":") || ""; }); rows.push(rec); save(); draw(); }));
    row.appendChild(btn("Export CSV", function () { dl(app.id + "-table.csv", cols.join(",") + "\n" + rows.map(function (r) { return cols.map(function (c) { return '"' + String(r[c]).replace(/"/g, '""') + '"'; }).join(","); }).join("\n"), "text/csv"); }));
  }
  draw();
}};
/* ---------- 21. sky (weather, honest sample data) ---------- */
DEMOS.sky = { title: "Live demo — sample forecast (demo data)", render: function (el, app) {
  var r = rnd(app.seed), days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], icons = ["☀️", "⛅", "🌧️", "⛈️", "🌤️"];
  el.innerHTML = '<div class="dsafety">Sample data for demonstration — connect your own feed in the full ' + esc(app.name) + '.</div><div class="dsky">' +
    days.map(function (d) { var hi = 18 + Math.floor(r() * 14), lo = hi - 6 - Math.floor(r() * 5); return '<div class="dcard2"><b>' + d + "</b><div style='font-size:1.6em'>" + icons[Math.floor(r() * icons.length)] + "</div>" + hi + "° / " + lo + "°</div>"; }).join("") + "</div>";
}};
/* ---------- 22. workout ---------- */
DEMOS.workout = { title: "Live demo — log a workout", render: function (el, app) {
  var log = store(app.id + "_workout") || [];
  function save() { store(app.id + "_workout", log); }
  function draw() {
    var days = {}; log.forEach(function (l) { days[l.d] = 1; });
    el.innerHTML = "<div class='dnote'>Days active: <b>" + Object.keys(days).length + "</b> · Sessions: <b>" + log.length + "</b></div><table class='dgrid'><tr><th>Date</th><th>Exercise</th><th>Reps/Time</th></tr>" +
      log.slice(-8).reverse().map(function (l) { return "<tr><td>" + esc(l.d) + "</td><td>" + esc(l.e) + "</td><td>" + esc(l.q) + "</td></tr>"; }).join("") + "</table><div class='drow'></div>";
    el.querySelector(".drow").appendChild(btn("+ Log session", function () { var e = prompt("Exercise:"), q = prompt("Reps or time:"); if (e) { log.push({ d: new Date().toLocaleDateString(), e: e, q: q || "" }); save(); draw(); } }));
  }
  draw();
}};
/* ---------- 23. recipes ---------- */
DEMOS.recipes = { title: "Live demo — scale a recipe", render: function (el, app) {
  var r = rnd(app.seed);
  var recs = [
    { n: "Golden Pancakes", ing: [["Flour", 200, "g"], ["Milk", 300, "ml"], ["Eggs", 2, ""], ["Sugar", 30, "g"]], serves: 4 },
    { n: "Hearty Soup", ing: [["Carrots", 3, ""], ["Potatoes", 4, ""], ["Broth", 750, "ml"], ["Onion", 1, ""]], serves: 6 }
  ];
  var i = Math.floor(r() * recs.length), servings = recs[i].serves;
  el.innerHTML = '<div class="drow"></div><div class="drec"></div>';
  function draw() {
    var rc = recs[i], f = servings / rc.serves;
    el.querySelector(".drec").innerHTML = "<h4>" + esc(rc.n) + " — serves " + servings + "</h4><ul>" + rc.ing.map(function (g) { var q = g[1] * f; return "<li>" + esc(g[0]) + ": " + (Math.round(q * 10) / 10) + " " + g[2] + "</li>"; }).join("") + "</ul>";
  }
  var row = el.querySelector(".drow");
  [["−", -1], ["+", 1]].forEach(function (x) { row.appendChild(btn(x[0] + " serving", function () { servings = Math.max(1, servings + x[1]); draw(); })); });
  row.appendChild(btn("Other recipe", function () { i = (i + 1) % recs.length; servings = recs[i].serves; draw(); }));
  row.appendChild(btn("Shopping list", function () { var rc = recs[i], f = servings / rc.serves; dl(app.id + "-shopping.txt", "SHOPPING LIST — " + rc.n + " (serves " + servings + ")\n" + rc.ing.map(function (g) { return "- " + g[0] + ": " + (Math.round(g[1] * f * 10) / 10) + " " + g[2]; }).join("\n")); }));
  draw();
}};
/* ---------- 24. flashcards ---------- */
DEMOS.flashcards = { title: "Live demo — quiz yourself", render: function (el, app) {
  var deck = [["Hola", "Hello"], ["Gracias", "Thank you"], ["Agua", "Water"], ["Amigo", "Friend"], ["Casa", "House"]];
  var i = 0, score = 0, show = false;
  el.innerHTML = '<div class="dfc"></div><div class="drow"></div><div class="dnote"></div>';
  function draw() {
    el.querySelector(".dfc").innerHTML = "<div class='dfccard'>" + esc(show ? deck[i][1] : deck[i][0]) + "</div>";
    el.querySelector(".dnote").textContent = "Card " + (i + 1) + " of " + deck.length + " · Score " + score;
  }
  var row = el.querySelector(".drow");
  row.appendChild(btn("Flip", function () { show = !show; draw(); }));
  row.appendChild(btn("✓ Knew it", function () { score++; i = (i + 1) % deck.length; show = false; draw(); }));
  row.appendChild(btn("Next", function () { i = (i + 1) % deck.length; show = false; draw(); }));
  draw();
}};
/* ---------- 25. backup ---------- */
DEMOS.backup = { title: "Live demo — pack a real backup", render: function (el, app) {
  el.innerHTML = '<div class="dnote">This demo builds a <b>real .zip</b> (uncompressed store) with a manifest — download it and unzip anywhere.</div><div class="drow"></div>';
  el.querySelector(".drow").appendChild(btn("📦 Build backup .zip", function () {
    var manifest = "SIGNATURE SAFEKEEP BACKUP MANIFEST\nApp: " + app.name + " (" + app.id + ")\nDate: " + new Date().toISOString() + "\nFiles: 3\n";
    dlZip(app.id + "-backup.zip", [
      { name: "BACKUP-MANIFEST.txt", data: manifest },
      { name: "notes.txt", data: "Demo notes from " + app.name + "\nBacked up " + new Date().toLocaleString() },
      { name: "RESTORE.txt", data: "To restore: unzip this pack where you keep your files.\nMade with " + app.name + "." }
    ]);
  }));
}};


/* ---------- 26. aichat (AI chat companion) ---------- */
DEMOS.aichat = { title: "Live demo — talk to the AI", render: function (el, app) {
  el.innerHTML = '<div class="dchatlog"></div><div class="drow"><input class="dsearch" id="daichat_in" placeholder="Ask the AI anything\u2026"></div><div class="dnote">A Signature demo brain \u2014 keyword answers, everything stays on your device.</div>';
  var log = el.querySelector(".dchatlog");
  function say(who, t) { log.innerHTML += '<div class="dchat ' + who + '"><b>' + who + ":</b> " + esc(t) + "</div>"; log.scrollTop = 1e6; }
  function reply(q) {
    var s = q.toLowerCase();
    if (/^(hi|hello|hey|yo)\b/.test(s)) return "Hello! I'm the demo brain inside " + app.name + ". Ask me for a joke, some advice, or what I can do.";
    if (/your name|who are you/.test(s)) return "I'm " + app.name + " (" + app.id + "), an original Signature-line AI app by Justin Addam Higgins.";
    if (/joke/.test(s)) return ["Why do programmers prefer dark mode? Because light attracts bugs.", "I told my computer I needed a break \u2014 now it won't stop sending me KitKat ads.", "There are only 10 kinds of people: those who understand binary and those who don't."][Math.floor(Math.random() * 3)];
    if (/advice|tip/.test(s)) return "Here's a thought: " + ["small steps beat big plans.", "write it down before you forget it.", "done is better than perfect."][Math.floor(Math.random() * 3)];
    if (/what can you do|help|feature/.test(s)) return "I chat, keep this session's history, and the full app adds " + app.features.slice(0, 2).join(" and ") + ".";
    if (/weather/.test(s)) return "I can't see the sky from in here, but the demo forecast says: 100% chance of productivity.";
    if (/thank/.test(s)) return "You're welcome! Anything else on your mind?";
    if (/bye/.test(s)) return "Goodbye! Our chat stays right here in the demo.";
    var words = s.split(/\s+/).filter(function (w) { return w.length > 3; });
    if (words.length) return "Interesting \u2014 tell me more about \u201c" + words[0] + "\u201d. In the full app I'd remember this across sessions.";
    return "Noted! Try asking for a joke, some advice, or what I can do.";
  }
  say("ai", "Hi, I'm the AI inside " + app.name + ". This demo really talks \u2014 say hello!");
  el.querySelector("#daichat_in").addEventListener("keydown", function (e) { if (e.key === "Enter" && this.value.trim()) { var q = this.value.trim(); say("you", q); this.value = ""; setTimeout(function () { say("ai", reply(q)); }, 450); } });
}};
/* ---------- 27. aiimage (AI image studio) ---------- */
DEMOS.aiimage = { title: "Live demo — AI image studio", render: function (el, app) {
  el.innerHTML = '<div class="drow"><input class="dsearch" id="daiimg_seed" value="7" style="width:90px" aria-label="Seed"><button class="dbtn" id="daiimg_go">Generate</button><button class="dbtn" id="daiimg_dl">Download PNG</button></div><canvas class="dpaint" id="daiimg_cv" width="360" height="240"></canvas><div class="dnote">Seeded generative art \u2014 same seed always paints the same picture.</div>';
  var cv = el.querySelector("#daiimg_cv"), ctx = cv.getContext("2d");
  function paint(seed) {
    var r = rnd(seed), W = cv.width, H = cv.height, i;
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "hsl(" + Math.floor(r() * 360) + ",60%,12%)"); g.addColorStop(1, "hsl(" + Math.floor(r() * 360) + ",60%,24%)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (i = 0; i < 26; i++) { ctx.beginPath(); ctx.strokeStyle = "hsla(" + Math.floor(r() * 360) + ",80%,60%," + (0.25 + r() * 0.5).toFixed(2) + ")"; ctx.lineWidth = 1 + r() * 3; var x = r() * W, y = r() * H, rad = 10 + r() * 70, a0 = r() * 6.28; ctx.arc(x, y, rad, a0, a0 + 2 + r() * 4); ctx.stroke(); }
    for (i = 0; i < 6; i++) { ctx.fillStyle = "hsla(" + Math.floor(r() * 360) + ",90%,65%,0.85)"; ctx.beginPath(); ctx.arc(r() * W, r() * H, 3 + r() * 9, 0, 6.29); ctx.fill(); }
  }
  function go() { paint(parseInt(el.querySelector("#daiimg_seed").value, 10) || 1); }
  el.querySelector("#daiimg_go").onclick = go;
  el.querySelector("#daiimg_dl").onclick = function () { var a = document.createElement("a"); a.download = app.id + "-art.png"; a.href = cv.toDataURL("image/png"); document.body.appendChild(a); a.click(); a.remove(); };
  go();
}};
/* ---------- 28. aivoice (AI voice studio) ---------- */
DEMOS.aivoice = { title: "Live demo — AI voice studio", render: function (el, app) {
  var ok = ("speechSynthesis" in window);
  el.innerHTML = '<div class="drow"><input class="dsearch" id="daivoice_t" value="Hello from ' + esc(app.name) + '"></div><div class="drow"><button class="dbtn" id="daivoice_go">Speak</button><button class="dbtn" id="daivoice_stop">Stop</button></div><div class="dnote">' + (ok ? "Uses your device's own voices \u2014 nothing is recorded or sent anywhere." : "Speech isn't available in this browser \u2014 the full app bundles its own voices.") + '</div>';
  el.querySelector("#daivoice_go").onclick = function () { if (!ok) return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(el.querySelector("#daivoice_t").value)); };
  el.querySelector("#daivoice_stop").onclick = function () { if (ok) speechSynthesis.cancel(); };
}};
/* ---------- 29. aimusic (AI composer) ---------- */
DEMOS.aimusic = { title: "Live demo — AI composer", render: function (el, app) {
  el.innerHTML = '<div class="drow"><input class="dsearch" id="daimus_seed" value="42" style="width:90px" aria-label="Seed"><button class="dbtn" id="daimus_go">Compose &amp; Play</button><button class="dbtn" id="daimus_dl">Download tune</button></div><div class="dcode" id="daimus_notes">Press Compose.</div><div class="dnote">Seeded melody \u2014 same seed, same song.</div>';
  var scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25], names = ["C", "D", "E", "G", "A", "C5", "D5", "E5"];
  var AC = window.AudioContext || window.webkitAudioContext, tune = [];
  function compose(seed) { var r = rnd(seed), out = [], n = 8 + Math.floor(r() * 8), i; for (i = 0; i < n; i++) { var k = Math.floor(r() * scale.length); out.push({ f: scale[k], n: names[k], d: 0.22 + r() * 0.25 }); } return out; }
  el.querySelector("#daimus_go").onclick = function () {
    tune = compose(parseInt(el.querySelector("#daimus_seed").value, 10) || 1);
    el.querySelector("#daimus_notes").textContent = "Now playing: " + tune.map(function (t) { return t.n; }).join(" ");
    if (!AC) return; var ac = new AC(), t0 = ac.currentTime;
    tune.forEach(function (t) { var o = ac.createOscillator(), g = ac.createGain(); o.type = "triangle"; o.frequency.value = t.f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.d); o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + t.d + 0.05); t0 += t.d; });
  };
  el.querySelector("#daimus_dl").onclick = function () { if (!tune.length) return; dl(app.id + "-tune.txt", "AI COMPOSITION \u2014 " + app.name + " (" + app.id + ")\nSeed: " + el.querySelector("#daimus_seed").value + "\n" + tune.map(function (t) { return t.n + "  " + t.f.toFixed(2) + "Hz  " + t.d.toFixed(2) + "s"; }).join("\n"), "text/plain"); };
}};
/* ---------- 30. aiwriter (AI writing partner) ---------- */
DEMOS.aiwriter = { title: "Live demo — AI writing partner", render: function (el, app) {
  el.innerHTML = '<div class="drow"><select class="dsearch" id="daiw_kind"><option value="story">Story opening</option><option value="poem">Poem</option><option value="email">Polite email</option></select><input class="dsearch" id="daiw_topic" value="a lighthouse" aria-label="Topic"></div><div class="drow"><button class="dbtn" id="daiw_go">Write</button><button class="dbtn" id="daiw_dl">Download text</button></div><div class="ddoc" id="daiw_out">Give me a topic and press Write.</div>';
  var last = "";
  function write(kind, topic) {
    var T = topic.trim() || "something wonderful";
    if (kind === "poem") return "Ode to " + T + "\n\nOh " + T + ", quiet and bright,\nYou turn the ordinary into light.\nMorning finds you, soft and true \u2014\nThe day is better for knowing you.";
    if (kind === "email") return "Subject: A quick note about " + T + "\n\nHello,\n\nI hope you're well. I'm writing about " + T + " \u2014 I'd love your thoughts when you have a moment.\n\nWarm regards";
    return ["The morning it happened, " + T + " was quieter than usual \u2014 too quiet, the way the air goes still before a storm.", "Nobody believed the stories about " + T + " until the day the lights went out across the whole town.", "It began, as these things do, with " + T + " and a strange letter that arrived with no stamp."][Math.floor(Math.random() * 3)] + "\n\nWhat happened next, nobody could have predicted \u2014 least of all the one holding the letter.";
  }
  el.querySelector("#daiw_go").onclick = function () { last = write(el.querySelector("#daiw_kind").value, el.querySelector("#daiw_topic").value); el.querySelector("#daiw_out").textContent = last; };
  el.querySelector("#daiw_dl").onclick = function () { if (last) dl(app.id + "-writing.txt", last + "\n\n\u2014 written with " + app.name + " (" + app.id + ")", "text/plain"); };
}};
/* ---------- 31. aicode (AI code helper) ---------- */
DEMOS.aicode = { title: "Live demo — AI code helper", render: function (el, app) {
  var SNIPS = {
    "python: read a file": "with open('data.txt') as f:\n    for line in f:\n        print(line.rstrip())",
    "python: fetch JSON": "import json, urllib.request\nwith urllib.request.urlopen('https://example.com/api') as r:\n    print(json.load(r))",
    "python: CSV to list": "import csv\nrows = list(csv.reader(open('in.csv')))\nprint(len(rows), 'rows')",
    "js: fetch JSON": "fetch('https://example.com/api')\n  .then(r => r.json())\n  .then(d => console.log(d));",
    "js: countdown timer": "let s = 10;\nconst t = setInterval(() => {\n  console.log(s);\n  if (--s < 0) clearInterval(t);\n}, 1000);",
    "html: hello button": "<button onclick=\"greet()\">Say hi</button>\n<script>\nfunction greet(){ alert('Hello!'); }\n<\/script>"
  };
  var keys = Object.keys(SNIPS);
  el.innerHTML = '<div class="drow"><select class="dsearch" id="daicode_k">' + keys.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join("") + '</select></div><div class="drow"><button class="dbtn" id="daicode_go">Generate</button><button class="dbtn" id="daicode_copy">Copy</button><button class="dbtn" id="daicode_dl">Download</button></div><pre class="dcode" id="daicode_out">Pick a task and press Generate.</pre><div class="dnote">Real, runnable snippets \u2014 the full app explains each line.</div>';
  function cur() { return SNIPS[el.querySelector("#daicode_k").value]; }
  el.querySelector("#daicode_go").onclick = function () { el.querySelector("#daicode_out").textContent = cur(); };
  el.querySelector("#daicode_copy").onclick = function () { var t = cur(); if (navigator.clipboard) navigator.clipboard.writeText(t); };
  el.querySelector("#daicode_dl").onclick = function () { dl(app.id + "-snippet.txt", cur() + "\n\n// generated by " + app.name + " (" + app.id + ")", "text/plain"); };
}};
/* ---------- 32. aitranslate (AI translator) ---------- */
DEMOS.aitranslate = { title: "Live demo — AI translator", render: function (el, app) {
  var D = {
    es: { hello: "hola", "thank you": "gracias", please: "por favor", yes: "s\u00ed", no: "no", water: "agua", food: "comida", friend: "amigo", love: "amor", "good morning": "buenos d\u00edas", goodbye: "adi\u00f3s", cat: "gato", dog: "perro", house: "casa", book: "libro", computer: "computadora", music: "m\u00fasica", happy: "feliz", day: "d\u00eda", night: "noche" },
    fr: { hello: "bonjour", "thank you": "merci", please: "s'il vous pla\u00eet", yes: "oui", no: "non", water: "eau", food: "nourriture", friend: "ami", love: "amour", "good morning": "bonjour", goodbye: "au revoir", cat: "chat", dog: "chien", house: "maison", book: "livre", computer: "ordinateur", music: "musique", happy: "heureux", day: "jour", night: "nuit" },
    de: { hello: "hallo", "thank you": "danke", please: "bitte", yes: "ja", no: "nein", water: "Wasser", food: "Essen", friend: "Freund", love: "Liebe", "good morning": "guten Morgen", goodbye: "tsch\u00fcss", cat: "Katze", dog: "Hund", house: "Haus", book: "Buch", computer: "Computer", music: "Musik", happy: "gl\u00fccklich", day: "Tag", night: "Nacht" }
  };
  var NAMES = { es: "Spanish", fr: "French", de: "German" };
  el.innerHTML = '<div class="drow"><input class="dsearch" id="daitr_in" value="hello friend, thank you"></div><div class="drow">' + Object.keys(D).map(function (k) { return '<button class="dbtn" data-l="' + k + '">\u2192 ' + NAMES[k] + '</button>'; }).join("") + '</div><div class="ddoc" id="daitr_out">Type English, pick a language.</div><div class="dnote">Demo dictionary of everyday words \u2014 the full app covers whole phrases.</div>';
  function tr(lang) {
    var d = D[lang], words = el.querySelector("#daitr_in").value.toLowerCase().split(/([a-z' ]+)/g);
    var out = el.querySelector("#daitr_in").value.toLowerCase().split(/\b/).map(function (w) { var t = w.trim(); if (!t) return w; return (d[t] !== undefined ? d[t] : t + " [?]"); }).join("");
    el.querySelector("#daitr_out").textContent = NAMES[lang] + ": " + out;
  }
  Array.prototype.forEach.call(el.querySelectorAll("[data-l]"), function (b) { b.onclick = function () { tr(b.getAttribute("data-l")); }; });
}};
/* ---------- 33. aivision (AI vision lab) ---------- */
DEMOS.aivision = { title: "Live demo — AI vision lab", render: function (el, app) {
  el.innerHTML = '<div class="drow"><button class="dbtn" id="daivis_gen">New test image</button><button class="dbtn" id="daivis_gray">Grayscale</button><button class="dbtn" id="daivis_inv">Invert</button><button class="dbtn" id="daivis_pix">Pixelate</button><button class="dbtn" id="daivis_analyze">Analyze</button></div><canvas class="dpaint" id="daivis_cv" width="300" height="200"></canvas><div class="dcode" id="daivis_out">Generate an image, then filter or analyze it.</div><div class="dnote">Demo vision: real pixel math on a generated test image.</div>';
  var cv = el.querySelector("#daivis_cv"), ctx = cv.getContext("2d"), seed = 5;
  function gen() { seed += 7; var r = rnd(seed), i; ctx.fillStyle = "#0a0f1e"; ctx.fillRect(0, 0, 300, 200);
    for (i = 0; i < 12; i++) { ctx.fillStyle = "hsl(" + Math.floor(r() * 360) + ",70%," + (30 + Math.floor(r() * 40)) + "%)"; ctx.fillRect(r() * 260, r() * 160, 20 + r() * 60, 20 + r() * 60); } }
  function each(fn) { var d = ctx.getImageData(0, 0, 300, 200), p = d.data, i; for (i = 0; i < p.length; i += 4) fn(p, i); ctx.putImageData(d, 0, 0); }
  el.querySelector("#daivis_gen").onclick = gen;
  el.querySelector("#daivis_gray").onclick = function () { each(function (p, i) { var v = 0.3 * p[i] + 0.6 * p[i + 1] + 0.1 * p[i + 2]; p[i] = p[i + 1] = p[i + 2] = v; }); };
  el.querySelector("#daivis_inv").onclick = function () { each(function (p, i) { p[i] = 255 - p[i]; p[i + 1] = 255 - p[i + 1]; p[i + 2] = 255 - p[i + 2]; }); };
  el.querySelector("#daivis_pix").onclick = function () { var s = 10, x, y; for (y = 0; y < 200; y += s) for (x = 0; x < 300; x += s) { var d = ctx.getImageData(x, y, 1, 1).data; ctx.fillStyle = "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")"; ctx.fillRect(x, y, s, s); } };
  el.querySelector("#daivis_analyze").onclick = function () { var d = ctx.getImageData(0, 0, 300, 200).data, i, rS = 0, gS = 0, bS = 0, n = d.length / 4, edges = 0;
    for (i = 0; i < d.length; i += 4) { rS += d[i]; gS += d[i + 1]; bS += d[i + 2]; }
    for (i = 4; i < d.length; i += 4) { if (Math.abs(d[i] - d[i - 4]) > 60) edges++; }
    var dom = rS > gS && rS > bS ? "red" : (gS > bS ? "green" : "blue");
    el.querySelector("#daivis_out").textContent = "Analysis (" + app.id + " demo): dominant hue " + dom + ", mean brightness " + Math.round((rS + gS + bS) / n / 3) + "/255, edge pixels " + edges + " of " + n + ". Honest demo math \u2014 the full app trains on real photos.";
  };
  gen();
}};

root.DEMOS = DEMOS;
root.dlFile = dl; root.dlZip = dlZip; root.zipFiles = zipFiles; root.crc32 = crc32; root.crc32bytes = crc32bytes; root.utf8bytes = utf8bytes;
})(typeof self !== "undefined" ? self : this);
