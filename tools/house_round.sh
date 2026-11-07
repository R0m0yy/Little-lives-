#!/bin/bash
# House round (H7+): build -> matched-camera measure -> report [-> Cycles + floor/room close-ups when extra=1]
# usage: tools/house_round.sh <round#> "<the one change>" [extra]
set -e
cd "$(dirname "$0")/.."
N=$(printf %02d "$1"); T="h$N"; O=qa/house3d
python3 art/house/build_house.py 2>&1 | grep -E "EXPORTED|Error|Traceback|line [0-9]" || true
node tools/house_measure.cjs $T > /dev/null
if [ "$3" = "1" ]; then
  python3 tools/house_cycles.py $T ${CYCLES_SAMPLES:-24} 2>&1 | grep -E "^CYCLES|Error|Traceback" || true
  for f in 1 2 3 4; do node tools/render.cjs "house.html?floor=$f" $O/${T}_floor$f.png 1200 600 || true; done
  node tools/render.cjs "house.html?room=${ROOM:-R00}" $O/${T}_room.png 1000 700 || true
fi
python3 tools/house_report.py $T "House round $1 (matched reference camera): $2" | tail -1
