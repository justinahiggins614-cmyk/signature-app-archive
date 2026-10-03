#!/bin/bash
# QA runner for The Signature App Archive. Fails loudly on any gate failure.
set -e
cd "$(dirname "$0")/../.."
echo "=== node --check ==="
for f in code/appgen.js code/demos.js code/solve_batch.js; do
  node --check "$f" && echo "OK $f"
done
python3 - << 'EOF'
import re
t = open('index.html', encoding='utf-8').read()
blocks = re.findall(r'<script>([\s\S]*?)</script>', t)
open('/tmp/app_inline.js','w').write("\n;\n".join(blocks))
print("inline script blocks:", len(blocks))
EOF
node --check /tmp/app_inline.js && echo "OK index.html inline JS"
echo "=== determinism ==="
python3 code/qa/test_determinism.py
echo "=== gates ==="
python3 code/qa/checks.py
