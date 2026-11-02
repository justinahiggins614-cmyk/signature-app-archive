#!/usr/bin/env node
/* Batch-solve full app records in ONE node process.
 * stdin: lines of "cat|seed|appid"  -> stdout: one JSON record per line.
 * Used by code/build_sitemap.py for the per-category apps-catalog feed shards. */
var SigApp = require("./appgen.js");
var rl = require("readline").createInterface({ input: process.stdin, terminal: false });
rl.on("line", function (line) {
  line = line.trim();
  if (!line) return;
  var p = line.split("|");
  var out;
  try {
    out = JSON.stringify(SigApp.solve(p[0], parseInt(p[1], 10), p[2])) + "\n";
  } catch (e) {
    out = JSON.stringify({ error: String(e && e.message || e), input: line }) + "\n";
  }
  // Backpressure (2026-11-02): writing ~455k records without pausing
  // overflows the stdout pipe when the consumer lags, and node then dies
  // with "write ENOBUFS". Pause the line reader until the pipe drains.
  if (!process.stdout.write(out)) rl.pause();
});
process.stdout.on("drain", function () { if (!rl.closed) rl.resume(); });
