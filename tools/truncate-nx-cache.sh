#!/bin/bash

cd .nx/cache
echo "Truncating NX cache at $(pwd)..."
echo "NX cache has $(ls -1 *.commit | wc -l) entries ($(du -sh . | cut -f1)) before truncation"
ls -1 --sort=time *.commit | tail +150 | cut -d. -f1 | xargs -I R rm -rf R R.commit
echo "NX cache has $(ls -1 *.commit | wc -l) entries ($(du -sh . | cut -f1)) after truncation"
