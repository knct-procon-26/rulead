#!/usr/bin/env bash
# 事前にosmium-toolいれといて sudo apt install osmium-tool
set -euo pipefail

WORK="${1:-./osm-work}"
URL="https://download.geofabrik.de/asia/japan-latest.osm.pbf"
mkdir -p "$WORK"
cd "$WORK"

echo "[1/4] download (数GB。新しいデータにしたいときは japan-latest.osm.pbf を消してから実行)"
if [ ! -f japan-latest.osm.pbf ]; then
  curl -fL --retry 3 -o japan-latest.osm.pbf.part "$URL"
  mv japan-latest.osm.pbf.part japan-latest.osm.pbf
fi

echo "[2/4] filter"
osmium tags-filter japan-latest.osm.pbf \
  wr/leisure=park,playground,garden,dog_park,common,recreation_ground \
  wr/landuse=recreation_ground,village_green \
  -o areas.osm.pbf --overwrite

echo "[3/4] export"
osmium export areas.osm.pbf \
  -f geojsonseq --geometry-types=polygon --add-unique-id=type_id \
  -x print_record_separator=false \
  -o osm-areas.geojsonseq --overwrite

echo "[4/4] compress"
gzip -f osm-areas.geojsonseq

ls -lh osm-areas.geojsonseq.gz
echo "features: $(gzip -dc osm-areas.geojsonseq.gz | wc -l)"
