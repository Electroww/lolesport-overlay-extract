# LoL Esports OCR API

API OCR pour extraire les données des vidéos League of Legends Esports.

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Endpoints

- `POST /ocr/image` - OCR sur une image
- `POST /ocr/video` - OCR sur frames vidéo  
- `GET /ocr/status` - Statut du service
- `GET /health` - Health check

## Usage

### OCR Image
```bash
curl -X POST -F "image=@screenshot.png" http://localhost:3000/ocr/image
```

### OCR Video
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"videoPath":"/path/to/video.mp4","startTime":0,"endTime":60}' \
  http://localhost:3000/ocr/video
```