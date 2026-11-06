#!/bin/bash
# usage: tools/naomi_round.sh <round#> "<what changed / biggest difference addressed>"
set -e
cd "$(dirname "$0")/.."
N=$(printf %02d "$1"); T="$2"; O=qa/naomi3d
python3 art/naomi/build_naomi.py 2>&1 | grep -E "EXPORTED|Error|Traceback" || true
node tools/render.cjs "viewer.html?yaw=${YAW:-18}" $O/r${N}_full.png 500 900
node tools/render.cjs "viewer.html?view=face&yaw=${YAW:-18}" $O/r${N}_face.png 600 600
node tools/render.cjs "viewer.html?view=back" $O/r${N}_back.png 400 720
python3 tools/side_by_side.py $O/round_${N}.png "Naomi round $1: $T" refs/crops/naomi.png $O/r${N}_full.png $O/r${N}_face.png $O/r${N}_back.png
