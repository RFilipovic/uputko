#!/usr/bin/env bash
# Rebuild data/clean/ and supabase/seed.sql from the committed raw snapshot.
# Offline and deterministic. To refresh the raw snapshot first: .venv/bin/python fetch.py
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi
.venv/bin/python transform.py
.venv/bin/python geocode.py --offline   # cached coordinates only
.venv/bin/python load.py
