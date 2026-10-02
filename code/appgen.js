#!/usr/bin/env node
/* The Signature App Archive — deterministic app generator.
 * Same (category, seed) always yields the same fully-specified app.
 * CLI: node code/appgen.js families | batch <cat> <start> <n> | solve <cat> <seed>
 * Also loaded by index.html as <script src="code/appgen.js"> exposing window.SigApp.
 */
(function (root, factory) {
  var S = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = S;
  else root.SigApp = S;
})(typeof self !== "undefined" ? self : this, function () {

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
function pickN(r, arr, n) {
  var c = arr.slice(), out = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(r() * c.length), 1)[0]);
  return out;
}
function int(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
var pad6 = function (n) { return "JAH-APP-" + String(n).padStart(6, "0"); };

var EDITIONS = ["", "Pro", "Lite", "Studio", "Express", "Plus", "Go", "Max", "Prime", "26"];
var AUDIENCES = ["Home", "Team", "Studio", "Solo", "Family", "Field", "Office", "Crew", "Class", "Club"];
var TAGLINES = [
  "Your everyday workhorse, Signature-tuned.",
  "Small download, big job done right.",
  "Built for speed, priced for everyone.",
  "The friendly one you'll actually open daily.",
  "Serious tools without the serious learning curve.",
  "Runs offline first, syncs when you say so.",
  "One window, zero clutter, everything handy.",
  "Made to be the last one of its kind you'll install."
];
var DESC_A = [
  "opens fast and stays out of your way",
  "keeps every control within one click",
  "remembers exactly where you left off",
  "works fully offline and syncs on your word",
  "treats your files like they matter — because they do",
  "was designed around real daily chores, not demos"
];
var DESC_B = [
  "Keyboard-first shortcuts sit beside big friendly buttons, so beginners and power users share the same window happily.",
  "Every file it makes is a plain, portable format you can open anywhere — no lock-in, no ransom, no surprises.",
  "Autosave runs quietly in the background, and a full version history lets you rewind any change in one click.",
  "It speaks your printer, your scanner, and your cloud drive without plugins, accounts, or upsells.",
  "A guided first-run tour has you productive in under five minutes, and the built-in handbook answers the rest."
];

var CATS = [
  { key: "word", name: "Signature Wordsmith", icon: "📝", demo: "editor",
    blurb: "Full word processor — write, format, paginate, print.",
    feats: ["Rich-text editing with styles and themes", "Headers, footers, page numbers, footnotes", "Tables, images, and text wrapping", "Track-changes style revision marks", "One-click PDF and plain-text export", "Word count, reading time, readability score", "Mail-merge style template fields", "Spellcheck in 40 languages", "Outline and focus writing modes", "Cloud-optional local file storage", "Print preview with margin control", "Keyboard shortcut cheat-sheet built in"] },
  { key: "sheet", name: "Signature Ledger", icon: "📊", demo: "grid",
    blurb: "Real spreadsheet — formulas, functions, charts.",
    feats: ["Live formulas (=A1+B2, SUM, AVG, IF)", "120+ built-in functions", "Cell formatting, borders, number styles", "Sort, filter, and freeze panes", "Bar/line/pie charts from any range", "CSV import and export", "Named ranges and sheet tabs", "Conditional color rules", "Undo history per cell", "Print-ready page setup", "Template gallery: budgets, invoices", "Offline-first, autosaves locally"] },
  { key: "slides", name: "Signature Stagecraft", icon: "🎤", demo: "slides",
    blurb: "Presentation maker — slides, themes, present mode.",
    feats: ["Drag-and-drop slide builder", "24 designer themes", "Transitions and build animations", "Speaker notes per slide", "Present mode with timer", "Image, chart, and table slides", "Export to PDF handouts", "Reusable master layouts", "Spellcheck across the deck", "Auto-advance kiosk mode", "Aspect presets: 16:9, 4:3, portrait", "Local files, no account needed"] },
  { key: "mail", name: "Signature Postbox", icon: "✉️", demo: "mailbox",
    blurb: "Email client — compose, folders, search, signatures.",
    feats: ["Unified inbox with smart folders", "Fast full-text search", "Rich compose with attachments", "Signature blocks and templates", "Rules and filters", "Conversation threading", "Offline reading and queueing", "Contact auto-complete", "Spam and clutter controls", "Calendar invites built in", "Multiple account support", "One-click unsubscribe helpers"] },
  { key: "calendar", name: "Signature Daybook", icon: "📅", demo: "calendar",
    blurb: "Calendar and scheduler — events, reminders, views.",
    feats: ["Month, week, and agenda views", "Recurring events made simple", "Reminders with snooze", "Color-coded calendars", "Drag to reschedule", "All-day and multi-day events", "Import/export standard calendar files", "Search across every event", "Time-zone aware scheduling", "Print-friendly month pages", "Birthday and anniversary tracking", "Works fully offline"] },
  { key: "notes", name: "Signature Jotter", icon: "🗒️", demo: "editor",
    blurb: "Note-taker — quick capture, notebooks, tags.",
    feats: ["Instant capture, zero friction", "Notebooks and tags", "Checklists with progress rings", "Pinned favorites", "Full-text search", "Attach images and files", "Daily journal prompts", "Export notes to text/PDF", "Dark mode for night writing", "Word counts per note", "Archive instead of delete", "Local-first storage"] },
  { key: "accounting", name: "Signature Tally", icon: "🧮", demo: "ledger",
    blurb: "Small-business accounting — ledger, reports, tax-ready.",
    feats: ["Double-entry ledger", "Income vs expense tracking", "Invoice and receipt logging", "Profit & loss reports", "Tax-category tagging", "Recurring transaction rules", "Multi-currency support", "CSV bank import", "Year-end summary export", "Client and vendor records", "Budget vs actual comparison", "Audit-friendly change log"] },
  { key: "inventory", name: "Signature Stockroom", icon: "📦", demo: "stock",
    blurb: "Inventory manager — stock in/out, alerts, counts.",
    feats: ["Item catalog with SKUs", "Stock in/out logging", "Low-stock alerts", "Barcode-style labels to print", "Stocktake count mode", "Supplier records", "Cost and price tracking", "Category and location bins", "Movement history per item", "CSV import/export", "Reorder point suggestions", "Works on a shared drive"] },
  { key: "pos", name: "Signature Till", icon: "🧾", demo: "till",
    blurb: "Point of sale — ring sales, receipts, end-of-day.",
    feats: ["Touch-friendly sale screen", "Product buttons with prices", "Discounts and tax rates", "Cash and card tender types", "Printed-style receipts", "End-of-day Z report", "Refunds and voids with log", "Held and recalled sales", "Customer receipts by email-text", "Sales history search", "Drawer count helper", "Offline-first register"] },
  { key: "hr", name: "Signature Crewbook", icon: "👥", demo: "directory",
    blurb: "HR helper — people records, time off, reviews.",
    feats: ["Employee directory cards", "Time-off requests and balances", "Review cycles and notes", "Document checklist per hire", "Org chart view", "Emergency contact storage", "Anniversary reminders", "Policy handbook pages", "Shift notes log", "Private manager notes", "Exportable reports", "Role-based views"] },
  { key: "project", name: "Signature Milestone", icon: "🗂️", demo: "kanban",
    blurb: "Project manager — boards, tasks, deadlines.",
    feats: ["Kanban boards that just work", "Task checklists and due dates", "Priority and label system", "Calendar view of deadlines", "Progress bars per project", "Comment threads on tasks", "File attachments per card", "Search across all projects", "Archived project vault", "Daily focus list", "Export project summaries", "No account, local files"] },
  { key: "chat", name: "Signature Chatter", icon: "💬", demo: "chat",
    blurb: "Team messenger — rooms, threads, file drops.",
    feats: ["Rooms and direct messages", "Threaded replies", "Emoji reactions", "File and image sharing", "Searchable history", "Pinned announcements", "Typing indicators", "Do-not-disturb hours", "Message editing", "Room member lists", "Export chat transcripts", "Runs on your own network"] },
  { key: "browser", name: "Signature Wayfarer", icon: "🧭", demo: "skyway",
    blurb: "Web browser — tabs, bookmarks, start page.",
    feats: ["Tabbed browsing", "Bookmark bar and folders", "Start page with quick dial", "History with full search", "Private windows", "Reader mode for articles", "Download manager", "Form auto-fill", "Zoom controls per site", "Homepage customization", "Session restore", "Tracker-blocking defaults"] },
  { key: "music", name: "Signature Jukebox", icon: "🎵", demo: "tones",
    blurb: "Media player — playlists, tones, visual calm.",
    feats: ["Playlist builder", "Gapless-style playback", "Tone and chime composer", "Sleep timer", "Playback speed control", "Favorites and ratings", "Import local audio files", "Calm visualizer mode", "Keyboard media keys", "Recently played list", "Export playlists", "Light on resources"] },
  { key: "games", name: "Signature Arcade", icon: "🎮", demo: "game",
    blurb: "Game chest — tic-tac-toe, snake, memory match.",
    feats: ["Three built-in games", "Vs-computer AI opponent", "High-score table", "Difficulty levels", "Pause anytime", "Sound-free focus mode", "Kid-friendly controls", "Quick 2-minute rounds", "Score history", "No ads, no timers pushing you", "Keyboard and touch play", "Instant restart"] },
  { key: "utils", name: "Signature Toolkit", icon: "🧰", demo: "convert",
    blurb: "Utility drawer — converter, passwords, timers.",
    feats: ["Unit converter (length, weight, temp)", "Strong password generator", "Stopwatch and countdown timers", "Color picker with hex codes", "Text case transformer", "Word and character counter", "Date difference calculator", "QR-style code cards to print", "Clipboard history", "Screen ruler overlay", "Random number picker", "All tools offline"] },
  { key: "photo", name: "Signature Darkroom", icon: "📷", demo: "paint",
    blurb: "Photo editor — filters, crops, touch-ups.",
    feats: ["One-click photo filters", "Brightness/contrast sliders", "Crop and rotate", "Red-eye style touch-up", "Batch filter presets", "Before/after compare", "Export in web formats", "Print-size presets", "Gentle auto-enhance", "Undo stack", "Sample photos included", "Keeps originals safe"] },
  { key: "draw", name: "Signature Canvas", icon: "🎨", demo: "paint",
    blurb: "Drawing pad — brushes, layers of fun, export.",
    feats: ["Pressure-style brushes", "Color palette and picker", "Undo/redo stack", "Canvas sizes for print and web", "Shape tools", "Eraser and fill", "Save and reload artwork", "Export PNG", "Grid and symmetry guides", "Kid-simple mode", "Zoom for detail work", "Gallery of your pieces"] },
  { key: "pdf", name: "Signature Folio", icon: "📄", demo: "docview",
    blurb: "Document viewer — read, annotate, organize.",
    feats: ["Page-by-page reading", "Zoom and fit-width", "Highlight annotations", "Bookmarks per document", "Text search in document", "Table of contents pane", "Night reading mode", "Two-page spread view", "Print selected pages", "Recent documents shelf", "Sample library included", "Fast even on big files"] },
  { key: "video", name: "Signature Cutting Room", icon: "🎬", demo: "timeline",
    blurb: "Video editor — timeline, trims, titles, export plan.",
    feats: ["Multi-track timeline", "Trim and split clips", "Title and caption tracks", "Transitions library", "Audio level keyframes", "Export plan generator", "Project archiving", "Storyboard view", "Keyboard editing shortcuts", "Proxy-friendly workflow", "Honest render-time estimates", "EDL export for pro tools"] },
  { key: "code", name: "Signature Codepad", icon: "⌨️", demo: "runjs",
    blurb: "Code editor — write JavaScript, run it live.",
    feats: ["Syntax-highlighted editing", "One-click Run in sandbox", "Console output pane", "Snippet library", "Find and replace", "Line numbers and folding", "Auto-indent", "Save scripts locally", "Example programs included", "Error messages in plain words", "Dark and light themes", "Export scripts as files"] },
  { key: "db", name: "Signature Vault", icon: "🗄️", demo: "dbtable",
    blurb: "Simple database — tables, records, queries.",
    feats: ["Table designer", "Add/edit/delete records", "Sort and filter any column", "Saved filter views", "CSV import/export", "Record linking", "Full-text search", "Backup snapshots", "Field types: text, number, date", "Print-ready reports", "Sample datasets included", "Local-first, private"] },
  { key: "crm", name: "Signature Rolodex", icon: "🤝", demo: "directory",
    blurb: "Customer keeper — contacts, history, follow-ups.",
    feats: ["Contact cards with history", "Follow-up reminders", "Deal pipeline stages", "Interaction log", "Birthday and milestone flags", "Tag and segment lists", "Mail-merge letters", "Import from CSV", "Activity timeline", "Duplicate finder", "Export contact sheets", "Works offline at trade shows"] },
  { key: "forms", name: "Signature Clipboard", icon: "📋", demo: "dbtable",
    blurb: "Form builder — surveys, signups, responses.",
    feats: ["Drag-field form builder", "Text, choice, rating fields", "Response table", "Required-field logic", "Printable blank forms", "Response summaries", "Export responses to CSV", "Duplicate form templates", "Kiosk fill-in mode", "Confirmation messages", "Anonymous response option", "No sign-up to respond"] },
  { key: "weather", name: "Signature Skywatch", icon: "⛅", demo: "sky",
    blurb: "Weather desk — sample forecasts, planner (demo data).",
    feats: ["7-day outlook cards", "Hourly-style breakdown", "Severe-weather style alerts", "What-to-wear hints", "Sunrise/sunset times", "Planner: pick the best day", "Clearly labeled sample data", "Celsius/Fahrenheit toggle", "Favorite places list", "Weather journal notes", "Printable outlook", "Honest demo-data banner"] },
  { key: "fitness", name: "Signature Stride", icon: "🏃", demo: "workout",
    blurb: "Fitness log — workouts, streaks, personal bests.",
    feats: ["Workout logging", "Streak calendar", "Personal-best tracker", "Exercise library", "Rest timer between sets", "Weekly summary", "Goal setting", "Progress charts", "Notes per session", "Export your history", "Gentle reminder nudges", "Private, on your device"] },
  { key: "recipes", name: "Signature Cookbook", icon: "🍳", demo: "recipes",
    blurb: "Recipe box — cards, scalers, shopping lists.",
    feats: ["Recipe cards with steps", "Serving-size scaler", "Auto shopping lists", "Favorite stars", "Search by ingredient", "Timer links per step", "Meal-plan week view", "Print-friendly cards", "Family recipe notes", "Pantry checklist", "Cuisine tags", "Share as text"] },
  { key: "language", name: "Signature Tongue", icon: "🗣️", demo: "flashcards",
    blurb: "Language trainer — flashcards, quizzes, streaks.",
    feats: ["Flashcard decks", "Multiple-choice quizzes", "Daily streak tracking", "Pronunciation-style hints", "Phrasebook section", "Mistake review pile", "Progress per deck", "Listen-and-repeat prompts", "Kid-friendly picture mode", "Offline decks", "Custom card maker", "Encouraging scoring"] },
  { key: "finance", name: "Signature Mint", icon: "💰", demo: "ledger",
    blurb: "Money planner — budgets, goals, calm charts.",
    feats: ["Monthly budget builder", "Envelope-style categories", "Savings goal tracker", "Spending trends chart", "Bill reminders", "Net-worth snapshot", "Cash-flow forecast", "Receipt photo notes", "Debt payoff planner", "Export reports", "Private local storage", "Plain-words money tips"] },
  { key: "backup", name: "Signature Safekeep", icon: "💾", demo: "backup",
    blurb: "Backup buddy — manifests, packs, restore checks.",
    feats: ["Backup manifest builder", "One-click data pack (.zip)", "Restore checklist", "Scheduled reminders", "Disc-label printer text", "Integrity self-check", "Thumbdrive layout guide", "CD/DVD layout guide", "Versioned pack names", "Exclude-list patterns", "Log of every backup", "Works with any files"] }
];

var REQ_OS = ["SignatureOS 12 or newer", "Windows 10/11", "macOS 13 or newer", "Android 11 or newer", "iOS 16 or newer", "Any modern Linux"];
var REQ_RAM = ["2 GB RAM", "4 GB RAM", "8 GB RAM"];
var REQ_DISK = ["50 MB free space", "120 MB free space", "250 MB free space", "500 MB free space"];

function byKey(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i].key === k) return CATS[i]; return null; }

function solve(catKey, seed) {
  var c = byKey(catKey);
  if (!c) throw new Error("unknown category " + catKey);
  var r = mulberry32(seed * 2654435761 % 2147483647);
  var edition = pick(r, EDITIONS);
  var audience = pick(r, AUDIENCES);
  var name = c.name + (edition ? " " + edition : "") + " " + audience;
  var tagline = pick(r, TAGLINES);
  var plat = pickN(r, ["Phone", "PC", "Phone + PC"], 1)[0];
  var desc = name + " " + pick(r, DESC_A) + ". " + pick(r, DESC_B) +
    " It ships ready for " + plat + ", installs in seconds, and every file it creates stays yours.";
  var features = pickN(r, c.feats, 8);
  var how = [
    "Open " + name + " — the first-run tour points at the three things you'll use most.",
    "Start a new file from the " + pick(r, ["Templates", "Blank", "Samples"]) + " gallery and make it yours.",
    "Use the toolbar (or keyboard shortcuts) — everything autosaves as you go.",
    "Share or export with one click: " + pick(r, ["PDF, text, and web formats", "CSV and plain-text formats", "print-ready pages", "portable files"]) + ".",
    "Find anything later with the built-in search — your work is always one word away."
  ];
  var nv = 1 + Math.floor(r() * 3);
  var versions = [{ v: "1.0", note: "First Signature-line release — the complete core, stable and fast." }];
  if (nv > 1) versions.push({ v: "1.1", note: "Polish release — quicker startup, smoother lists, extra templates." });
  if (nv > 2) versions.push({ v: "2.0", note: "Second generation — refined workspace, new export options, same friendly feel." });
  var req = {
    os: pickN(r, REQ_OS, 2),
    ram: pick(r, REQ_RAM),
    disk: pick(r, REQ_DISK),
    display: pick(r, ["Any display", "Touch-friendly on tablets", "Best at 1280×800 or larger"])
  };
  return {
    id: pad6(0), // filled by batch
    family: catKey, seed: seed,
    name: name, tagline: tagline,
    icon: c.icon, catName: c.name,
    demo: c.demo,
    description: desc,
    features: features, how_to: how,
    versions: versions, requirements: req,
    platforms: plat,
    lineage: "An original Signature-line " + c.blurb.split(" — ")[0].toLowerCase() +
      " by Justin Addam Higgins — inspired by the app class, copying no product, brand, or design."
  };
}

function families() {
  return CATS.map(function (c) { return { key: c.key, name: c.name, icon: c.icon, blurb: c.blurb, demo: c.demo }; });
}

/* batch(cat, start, n, baseIndex) -> rows [id, cat, seed, name, tagline] */
function batch(cat, start, n, baseIndex) {
  var rows = [];
  for (var s = start; s < start + n; s++) {
    var o = solve(cat, s);
    var idx = baseIndex + rows.length + 1;
    o.id = pad6(idx);
    rows.push([o.id, cat, s, o.name, o.tagline]);
  }
  return rows;
}

function solveFull(cat, seed, id) {
  var o = solve(cat, seed);
  o.id = id;
  return o;
}

/* CLI */
if (typeof process !== "undefined" && require.main === module) {
  var a = process.argv.slice(2);
  if (a[0] === "families") console.log(JSON.stringify(families()));
  else if (a[0] === "batch") console.log(JSON.stringify(batch(a[1], parseInt(a[2], 10), parseInt(a[3], 10), parseInt(a[4] || "0", 10))));
  else if (a[0] === "solve") { var o = solveFull(a[1], parseInt(a[2], 10), a[3] || pad6(1)); console.log(JSON.stringify(o)); }
  else { console.error("usage: families|batch <cat> <start> <n> <baseIndex>|solve <cat> <seed> [id]"); process.exit(1); }
}

return { families: families, batch: batch, solve: solveFull, byKey: byKey, pad6: pad6 };
});
