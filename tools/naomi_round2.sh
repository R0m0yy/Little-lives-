#!/bin/bash
# Round 26+ (structured rebuild): build -> matched-camera measure (Three.js) -> Cycles -> report.
# usage: tools/naomi_round2.sh <round#> "<the one change this round>" [extra]   (extra=1: also full/back/face views)
set -e
cd "$(dirname "$0")/.."
N=$1; T="r$N"; O=qa/naomi3d
python3 art/naomi/build_naomi.py 2>&1 | grep -E "EXPORTED|Error|Traceback" || true
node tools/naomi_measure.cjs $T > /dev/null
python3 tools/naomi_cycles.py $T ${CYCLES_SAMPLES:-48} 2>&1 | grep -E "^CYCLES|Error|Traceback" || true
python3 tools/naomi_report.py $T "Naomi round $N (matched reference camera): $2" | tail -1
if [ "$3" = "1" ]; then
  node tools/render.cjs "viewer.html?yaw=20" $O/${T}_full.png 500 900
  node tools/render.cjs "viewer.html?view=face&yaw=20" $O/${T}_face.png 600 600
  node tools/render.cjs "viewer.html?view=back" $O/${T}_back.png 400 720
  python3 tools/side_by_side.py $O/${T}_views.png "Naomi round $N: full / face / back" refs/crops/naomi.png $O/${T}_full.png $O/${T}_face.png $O/${T}_back.png
fi
