#!/usr/bin/env python3
"""Build code/pytmpl.json: real working Python CLI companions, one per demo type."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = '# Companion CLI for {name} ({id})\n# Original Signature-line program by Justin Addam Higgins.\n# Run: python3 {file}\n\n'

T = {}

T["editor"] = H + '''import sys
DOC = []
print("Signature editor (CLI). Commands: add <text> | show | save <file> | quit")
while True:
    try: cmd = input("> ").strip()
    except EOFError: break
    if cmd == "quit": break
    elif cmd.startswith("add "): DOC.append(cmd[4:]); print("added line", len(DOC))
    elif cmd == "show":
        for i, l in enumerate(DOC, 1): print(i, l)
    elif cmd.startswith("save "):
        open(cmd[5:], "w").write("\\n".join(DOC)); print("saved")
    else: print("commands: add/show/save/quit")
'''

T["grid"] = H + '''import csv, re, sys
def colnum(t):
    m = re.match(r"([A-Z]+)([0-9]+)$", t); c = 0
    for ch in m.group(1): c = c * 26 + (ord(ch) - 64)
    return c - 1, int(m.group(2)) - 1
def ev(cell, g, seen):
    v = g[cell]
    if not v.startswith("="): return v
    e = v[1:]
    e = re.sub(r"SUM\\(([A-Z]+[0-9]+):([A-Z]+[0-9]+)\\)",
               lambda m: str(sum(float(ev((c, r), g, seen) or 0)
                   for r in range(min(colnum(m.group(1))[1], colnum(m.group(2))[1]),
                                     max(colnum(m.group(1))[1], colnum(m.group(2))[1]) + 1)
                   for c in range(min(colnum(m.group(1))[0], colnum(m.group(2))[0]),
                                     max(colnum(m.group(1))[0], colnum(m.group(2))[0]) + 1))), e)
    e = re.sub(r"[A-Z]+[0-9]+", lambda m: str(float(ev(colnum(m.group(0)), g, seen) or 0)), e)
    try: return str(eval(e, {"__builtins__": {}}))
    except Exception: return "#ERR"
path = sys.argv[1] if len(sys.argv) > 1 else "sheet.csv"
g = {}
for r, row in enumerate(csv.reader(open(path))):
    for c, v in enumerate(row): g[(c, r)] = v
for r in range(max(k[1] for k in g) + 1):
    print(",".join(str(ev((c, r), g, set())) for c in range(max(k[0] for k in g) + 1)))
'''

T["slides"] = H + '''import html
slides = [("Welcome", "Made with a Signature app."), ("Point one", "Keep it simple."), ("Thanks", "Questions?")]
out = ["<html><body>"]
for t, b in slides:
    out.append("<section style='page-break-after:always'><h1>%s</h1><p>%s</p></section>" % (html.escape(t), html.escape(b)))
out.append("</body></html>")
open("deck.html", "w").write("\\n".join(out)); print("wrote deck.html with", len(slides), "slides")
'''

T["mailbox"] = H + '''import json, os
BOX = "mailbox.json"
box = json.load(open(BOX)) if os.path.exists(BOX) else {"inbox": [], "sent": []}
while True:
    c = input("(inbox/sent/compose/quit)> ").strip()
    if c == "quit": break
    if c in ("inbox", "sent"):
        for i, m in enumerate(box[c], 1): print(i, m["s"], "-", m["f"])
    elif c == "compose":
        to = input("To: "); s = input("Subject: "); b = input("Body: ")
        box["sent"].append({"f": "me", "to": to, "s": s, "b": b}); print("sent (local demo)")
json.dump(box, open(BOX, "w"), indent=1)
'''

T["calendar"] = H + '''import calendar, json, os, sys
EV = json.load(open("events.json")) if os.path.exists("events.json") else {}
y, m = (int(x) for x in (sys.argv[1:3] if len(sys.argv) > 2 else (__import__("datetime").date.today().year, __import__("datetime").date.today().month)))
print(calendar.month(y, m))
k = "%d-%d" % (y, m)
for d, e in sorted(EV.get(k, {}).items()): print(" ", d, e)
d = input("Add event day (blank=skip): ").strip()
if d: EV.setdefault(k, {})[d] = input("Event: "); json.dump(EV, open("events.json", "w")); print("saved")
'''

T["ledger"] = H + '''import csv, os, sys
P = "ledger.csv"
tx = list(csv.reader(open(P))) if os.path.exists(P) else [["desc", "amount"]]
while True:
    c = input("(add/balance/quit)> ").strip()
    if c == "quit": break
    if c == "add":
        d = input("Description: "); a = float(input("Amount (+income/-expense): "))
        tx.append([d, a]); print("added")
    if c == "balance":
        print("Balance: $%.2f" % sum(float(r[1]) for r in tx[1:]))
csv.writer(open(P, "w")).writerows(tx)
'''

T["stock"] = H + '''import json, os
P = "stock.json"
items = json.load(open(P)) if os.path.exists(P) else [{"n": "Widget A", "q": 42}]
while True:
    c = input("(list/in/out/add/quit)> ").strip()
    if c == "quit": break
    if c == "list":
        for i, it in enumerate(items): print(i, it["n"], "qty", it["q"])
    elif c in ("in", "out"):
        i = int(input("Item #: ")); q = int(input("Qty: "))
        items[i]["q"] += q if c == "in" else -q; print("now", items[i]["q"])
    elif c == "add":
        items.append({"n": input("Name: "), "q": int(input("Qty: ") or 0)})
json.dump(items, open(P, "w"), indent=1)
'''

T["till"] = H + '''prods = [("Coffee", 2.50), ("Sandwich", 6.75), ("Book", 12.00)]
cart = []
while True:
    for i, (n, p) in enumerate(prods): print(i, n, "$%.2f" % p)
    c = input("item # (blank=checkout, q=quit)> ").strip()
    if c == "q": break
    if c == "": break
    cart.append(prods[int(c)])
t = sum(p for _, p in cart)
print("--- RECEIPT ---")
for n, p in cart: print("%-12s $%.2f" % (n, p))
print("TOTAL        $%.2f" % t)
'''

T["directory"] = H + '''import json, os
P = "people.json"
people = json.load(open(P)) if os.path.exists(P) else []
while True:
    c = input("(list/search/add/quit)> ").strip()
    if c == "quit": break
    if c == "list":
        for p in people: print(p["n"], "-", p.get("r", ""))
    elif c == "search":
        q = input("Name: ").lower()
        for p in people:
            if q in p["n"].lower(): print(p["n"], "-", p.get("r", ""), p.get("p", ""))
    elif c == "add":
        people.append({"n": input("Name: "), "r": input("Role: "), "p": input("Phone: ")}); print("added")
json.dump(people, open(P, "w"), indent=1)
'''

T["kanban"] = H + '''import json, os
P = "board.json"
b = json.load(open(P)) if os.path.exists(P) else {"todo": [], "doing": [], "done": []}
while True:
    for k, v in b.items(): print(k.upper(), ":", v)
    c = input("(add/move/quit)> ").strip()
    if c == "quit": break
    if c == "add": b["todo"].append(input("Task: "))
    if c == "move":
        f, t = input("from col: "), input("to col: "); i = int(input("index: "))
        b[t].append(b[f].pop(i))
json.dump(b, open(P, "w"), indent=1)
'''

T["chat"] = H + '''log = []
print("Chat demo. Type 'quit' to end, 'export' to save.")
while True:
    m = input("you: ").strip()
    if m == "quit": break
    if m == "export": open("chat.txt", "w").write("\\n".join("%s: %s" % x for x in log)); print("saved chat.txt"); continue
    r = "Hello! " if m.lower().startswith("hi") else "Noted: " + m
    print("host:", r); log += [("you", m), ("host", r)]
'''

T["skyway"] = H + '''import json, os, webbrowser
P = "bookmarks.json"
bm = json.load(open(P)) if os.path.exists(P) else {"Home": "https://example.com"}
while True:
    for n, u in bm.items(): print("-", n, u)
    c = input("(open <name>/add/quit)> ").strip()
    if c == "quit": break
    if c.startswith("open "): webbrowser.open(bm[c[5:]])
    if c == "add": bm[input("Name: ")] = input("URL: ")
json.dump(bm, open(P, "w"), indent=1)
'''

T["tones"] = H + '''import math, struct, wave
def tone(freq, secs, name):
    w = wave.open(name, "w"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100)
    frames = b"".join(struct.pack("<h", int(16000 * math.sin(2 * math.pi * freq * t / 44100))) for t in range(int(44100 * secs)))
    w.writeframes(frames); w.close(); print("wrote", name)
for i, f in enumerate([261.6, 329.6, 392.0, 523.3]): tone(f, 0.5, "tone%d.wav" % i)
'''

T["game"] = H + '''b = [" "] * 9
def win(p): return any(all(b[i] == p for i in L) for L in [(0,1,2),(3,4,5),(6,7,8),(0,3,6),(1,4,7),(2,5,8),(0,4,8),(2,4,6)])
while True:
    print("\\n".join("|".join(b[i:i+3]) for i in (0,3,6)))
    m = int(input("Your move (0-8): "))
    if b[m] != " ": print("taken"); continue
    b[m] = "X"
    if win("X"): print("You win!"); break
    e = [i for i, v in enumerate(b) if v == " "]
    if not e: print("Tie."); break
    import random; b[random.choice(e)] = "O"
    if win("O"): print("Computer wins."); break
'''

T["convert"] = H + '''while True:
    c = input("(len/wt/temp/quit)> ").strip()
    if c == "quit": break
    v = float(input("Value: "))
    print({"len": v * 3.28084, "wt": v * 2.20462, "temp": v * 9/5 + 32}[c])
'''

T["paint"] = H + '''w, h = 40, 20
cv = [[" "] * w for _ in range(h)]
def circle(x, y, r, ch="#"):
    for j in range(h):
        for i in range(w):
            if (i - x) ** 2 + (j - y) ** 2 <= r * r: cv[j][i] = ch
circle(20, 10, 7); circle(10, 5, 3, "."); circle(30, 15, 3, ".")
open("art.txt", "w").write("\\n".join("".join(r) for r in cv))
print("drew art.txt — open it to see your circles")
'''

T["docview"] = H + '''pages = ["Page 1: welcome.", "Page 2: the middle.", "Page 3: the end."]
i = 0
while True:
    print(pages[i], "(%d/%d)" % (i + 1, len(pages)))
    c = input("(n/p/quit)> ").strip()
    if c == "quit": break
    i = (i + (1 if c == "n" else -1)) % len(pages)
'''

T["timeline"] = H + '''clips = [("Intro", 4), ("Scene 1", 8), ("Outro", 3)]
t = 0
with open("edit-list.txt", "w") as f:
    for n, (name, d) in enumerate(clips, 1):
        f.write("%d  %s  %.1fs -> %.1fs\\n" % (n, name, t, t + d)); t += d
print("wrote edit-list.txt")
'''

T["runjs"] = H + '''print("Mini calculator REPL. Type an expression, blank to quit.")
while True:
    e = input("calc> ").strip()
    if not e: break
    try: print("=", eval(e, {"__builtins__": {}}))
    except Exception as ex: print("Error:", ex)
'''

T["dbtable"] = H + '''import csv, os, sys
P = sys.argv[1] if len(sys.argv) > 1 else "table.csv"
rows = list(csv.reader(open(P))) if os.path.exists(P) else [["Name", "Score"]]
while True:
    for r in rows: print(r)
    c = input("(add/quit)> ").strip()
    if c == "quit": break
    rows.append([input("Name: "), input("Score: ")])
csv.writer(open(P, "w")).writerows(rows)
'''

T["sky"] = H + '''import random
random.seed(7)
for d in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
    hi = random.randint(18, 31)
    print("%s  %d/%dC  %s" % (d, hi, hi - 7, random.choice(["sunny", "cloudy", "rain"])))
print("(sample data for demonstration)")
'''

T["workout"] = H + '''import csv, os, datetime
P = "workouts.csv"
rows = list(csv.reader(open(P))) if os.path.exists(P) else []
e = input("Exercise: "); q = input("Reps/time: ")
rows.append([str(datetime.date.today()), e, q])
csv.writer(open(P, "w")).writerows(rows)
print("logged. sessions:", len(rows))
'''

T["recipes"] = H + '''ing = [("Flour", 200, "g"), ("Milk", 300, "ml"), ("Eggs", 2, "")]
serves = 4
want = int(input("Servings wanted: "))
f = want / serves
for n, q, u in ing: print("%s: %.1f %s" % (n, q * f, u))
'''

T["flashcards"] = H + '''deck = [("Hola", "Hello"), ("Gracias", "Thank you"), ("Agua", "Water")]
score = 0
for q, a in deck:
    if input(q + " = ").strip().lower() == a.lower(): score += 1; print("right!")
    else: print("it was:", a)
print("score", score, "/", len(deck))
'''

T["backup"] = H + '''import zipfile, os, datetime
files = [f for f in os.listdir(".") if f.endswith((".txt", ".csv", ".json")) and f != "backup.py"]
name = "backup-%s.zip" % datetime.date.today().isoformat()
with zipfile.ZipFile(name, "w") as z:
    for f in files: z.write(f)
    z.writestr("BACKUP-MANIFEST.txt", "Backup %s\\nFiles: %d\\n" % (name, len(files)))
print("wrote", name, "with", len(files), "files")
'''

json.dump(T, open(os.path.join(ROOT, "code", "pytmpl.json"), "w"))
print("templates:", len(T))
