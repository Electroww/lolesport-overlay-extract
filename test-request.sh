#!/bin/bash

# Script pour tester l'API OCR vidéo
echo "🎬 Lancement du test OCR vidéo..."

curl -X POST \
  -H "Content-Type:application/json" \
  -d '{
    "videoPath": "/Users/elec/Desktop/LCO/videos/lck_replay.webm",
    "startTime": 0,
    "endTime": 10,
    "frameInterval": 1
  }' \
  http://localhost:3000/ocr/video | jq '.'

echo ""
echo "✅ Test terminé !"