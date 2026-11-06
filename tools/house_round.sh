#!/bin/bash
# usage: tools/house_round.sh <round#> "<biggest difference addressed>"
set -e
cd "$(dirname "$0")/.."
N=$(printf %02d "$1"); O=qa/house3d; mkdir -p $O
python3 art/house/build_house.py 2>&1 | grep -E "EXPORTED|Error|Traceback|line [0-9]" || true
node tools/render.cjs "house.html" $O/h${N}_front.png 1092 818
node tools/render.cjs "house.html?az=28&zoom=1.05" $O/h${N}_angle.png 1092 818
python3 tools/side_by_side.py $O/round_${N}.png "House round $1: $2" refs/crops/house.png $O/h${N}_front.png $O/h${N}_angle.png
