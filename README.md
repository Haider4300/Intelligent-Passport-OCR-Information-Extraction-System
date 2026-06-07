<div align="center">

# 🛂 Intelligent Passport OCR — Information Extraction System

**Automatically extract structured data from passport images using AI**

[![Python](https://img.shields.io/badge/Python-3.10-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6B35?style=flat-square)](https://ultralytics.com)
[![EasyOCR](https://img.shields.io/badge/EasyOCR-1.7-green?style=flat-square)](https://github.com/JaidedAI/EasyOCR)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

*Author: **Ali Haider** — 

---

![PassportOCR Demo](https://raw.githubusercontent.com/Haider4300/Intelligent-Passport-OCR-Information-Extraction-System/main/frontend/src/assets/hero.png)

</div>

---

## 📌 Overview

A full-stack AI web application that extracts passport information automatically from uploaded images. Upload a passport photo and get structured data back in seconds — no manual entry needed.

**Extracted fields:**
- 🔢 Passport Number
- 👤 Full Name
- 🎂 Date of Birth
- 🌍 Nationality

**How it works:**
1. **YOLOv8** detects the passport number region with a bounding box
2. **EasyOCR** reads text from the detected region and full image
3. **MRZ Parser** extracts all fields from the Machine Readable Zone (bottom two lines)
4. **Regex fallback** fills any field the MRZ parser missed
5. Results saved to **SQLite database** and displayed in the web UI

---

## 🧠 AI Pipeline

```
Passport Image
      │
      ├─► YOLOv8n ──────────► Crop passport number region
      │                              │
      │                              ▼
      │                        EasyOCR (cropped)
      │                              │
      ├─► Crop bottom 22% ──► EasyOCR (MRZ zone)
      │                              │
      │                              ▼
      │                        MRZ Parser
      │                        ┌─────────────────┐
      │                        │ passport_number  │
      │                        │ name             │
      │                        │ date_of_birth    │
      │                        │ nationality      │
      │                        └─────────────────┘
      │                              │
      └─► Full image fallback ───────┘
                    │
                    ▼
             SQLite Database
                    │
                    ▼
             React Web UI
```

---

## 📊 Model Performance (YOLOv8n)

| Metric | Score |
|---|---|
| mAP@50 | **99.5%** |
| mAP@50-95 | **60.6%** |
| Precision | **99.4%** |
| Recall | **100%** |
| Inference speed | **135ms / image (CPU)** |

> Trained on 50 passport images · 66 epochs (early stop) · Intel Core i5-8365U

---

## 🗂️ Project Structure

```
Intelligent-Passport-OCR-Information-Extraction-System/
│
├── backend/                        ← FastAPI Python backend
│   ├── main.py                     ← API server + static file serving
│   ├── ocr_service.py              ← YOLO + EasyOCR + MRZ parsing logic
│   ├── database.py                 ← SQLite setup (auto-created on run)
│   ├── models.py                   ← Pydantic response schemas
│   └── requirements.txt            ← Python dependencies
│
├── frontend/                       ← React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx                 ← Root component (state + layout)
│   │   ├── main.jsx                ← React entry point
│   │   ├── index.css               ← Global styles
│   │   ├── api/index.js            ← All backend API calls
│   │   └── components/
│   │       ├── UploadZone.jsx      ← Drag-and-drop image upload
│   │       ├── ResultCard.jsx      ← Extracted data display
│   │       ├── ProcessingOverlay.jsx ← Loading animation
│   │       ├── HistoryTable.jsx    ← Past scans table
│   │       └── StatusBanner.jsx    ← Backend health indicator
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── raw_data/
│   └── lables/                     ← YOLO annotation .txt files
│
├── dataset/
│   └── data.yaml                   ← YOLO dataset config
│
├── prepare_dataset.py              ← Step 1: organize data into train/val
├── train.py                        ← Step 2: train YOLOv8
├── extract.py                      ← Step 3: CLI extraction script
├── main.py                         ← Unified CLI entry point
├── Dockerfile                      ← Google Cloud Run deployment
├── cloudbuild.yaml                 ← CI/CD auto-deploy config
└── requirements.txt
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Step 1 — Clone the repo

```bash
git clone https://github.com/Haider4300/Intelligent-Passport-OCR-Information-Extraction-System.git
cd Intelligent-Passport-OCR-Information-Extraction-System
```

### Step 2 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# Install dependencies (~5-10 min, EasyOCR + PyTorch are large)
pip install -r requirements.txt
```

### Step 3 — Frontend setup

```bash
cd frontend
npm install
```

### Step 4 — Train the YOLO model

```bash
# From repo root (with venv active)
python main.py prepare   # organize dataset
python main.py train     # train YOLOv8 (~30-60 min on CPU)
```

> Model saved to: `runs/train/passport_detector/weights/best.pt`

---

## 🚀 Running the App

Open **two terminals** simultaneously:

**Terminal 1 — Backend:**
```bash
cd backend
source ../.venv/Scripts/activate   # Git Bash (Windows)
uvicorn main:app --reload --port 8000
```

Expected output:
```
✅ YOLO model loaded from: ...\best.pt
✅ EasyOCR ready.
✅ All models loaded. Server is ready!
INFO: Uvicorn running on http://127.0.0.1:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🖥️ Features

| Feature | Description |
|---|---|
| 📤 Drag & Drop Upload | Upload passport images by dragging or clicking |
| 🤖 AI Extraction | YOLOv8 + EasyOCR + MRZ parsing pipeline |
| 🟢 Live Status | Green/yellow/red backend health indicator |
| 📋 Scan History | All past scans saved to SQLite database |
| 📊 Stats Dashboard | Total scans, success count, success rate |
| 📥 Export CSV | Download all history as Excel-compatible CSV |
| 📄 Export PDF | Print-ready report via browser print dialog |
| 🗑️ Delete Records | Delete individual or all scan records |
| 📱 Responsive | Works on desktop and mobile |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend + model status |
| `POST` | `/api/extract` | Upload image → extracted data |
| `GET` | `/api/history` | All past scans |
| `GET` | `/api/history/{id}` | Single scan details |
| `DELETE` | `/api/history/{id}` | Delete a scan |

Interactive docs: **http://localhost:8000/docs**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Object Detection | YOLOv8n (Ultralytics) |
| OCR Engine | EasyOCR |
| MRZ Parsing | Custom regex pipeline |
| Backend | FastAPI + SQLite + SQLAlchemy |
| Frontend | React 18 + Vite + Tailwind CSS |
| Image Processing | OpenCV + NumPy |

---

## 🗄️ Database

Uses **SQLite** — no separate server needed. The file `backend/passport_ocr.db` is auto-created on first run and stores all scan records permanently.

---

## ⚠️ Privacy Notice

This project is for **educational purposes only**. Passport images used during development are sample/test images. Never upload real passport data to untrusted services. The database is local to your machine.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by **Ali Haider** · AI Engineer

*YOLOv8 + EasyOCR + FastAPI + React*

</div>
