#!/usr/bin/env node
/* Batch-solve full app records in ONE node process.
 * stdin: lines of "cat|seed|appid"  -> stdout: one JSON record per line.
 * Used by code/build_sitemap.py for the apps-catalog.json feed. */
var SigApp = require("./appgen.js");
var rl = require("readline").createInterface({ input: process.stdin, terminal: false });
rl.on("line", function (line) {
  line = line.trim();
  if (!line) return;
  var p = line.split("|");
  try {
    process.stdout.write(JSON.stringify(SigApp.solve(p[0], parseInt(p[1], 10), p[2])) + "\n");
  } catch (e) {
    process.stdout.write(JSON.stringify({ error: String(e && e.message || e), input: line }) + "\n");
  }
});
