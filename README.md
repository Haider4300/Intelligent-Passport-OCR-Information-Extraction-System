# 🛂 Passport OCR — Computer Vision Project
# Author: Ali Haider (AI-Engineer)

Automatically extract structured information from passport images using **YOLOv8** for region detection and **EasyOCR** for text recognition.

**Output fields:** `passport_number` · `name` · `date_of_birth` · `nationality`

---

## 🧠 How It Works

```
Passport Image
      ↓
YOLOv8n  ── detects the passport number bounding box
      ↓
EasyOCR  ── reads text from the detected region
      ↓
Regex parser ── extracts name, DOB, nationality from full image
      ↓
results.json / results.csv
```

---

## 📁 Project Structure

```
comp-vision-project/
├── raw_data/
│   ├── images/          # Original passport images (50 images)
│   └── lables/          # YOLO annotation .txt files (from LabelImg)
├── dataset/
│   ├── images/
│   │   ├── train/       # 80% split (40 images)
│   │   └── val/         # 20% split (10 images)
│   ├── labels/
│   │   ├── train/
│   │   └── val/
│   └── data.yaml        # YOLO dataset config
├
│
├── runs/                # Training results (auto-generated, not in git)
├── output/              # Extracted results JSON + CSV
├── prepare_dataset.py   # Step 1 — organize raw data into train/val
├── train.py             # Step 2 — train YOLOv8 on passport dataset
├── extract.py           # Step 3 — detect + OCR all passport fields
├── main.py              # Unified entry point
├── requirements.txt
└── README.md
```

---

## ⚙️ Setup

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/comp-vision-project.git
cd comp-vision-project
```

**2. Create a virtual environment and install dependencies**
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

**Or with uv (faster):**
```bash
uv sync
```

---

## 🚀 Usage

All steps run through `main.py`:

### Step 1 — Prepare dataset
Organizes `raw_data/` into YOLO-compatible `dataset/` structure with 80/20 train/val split.
```bash
python main.py prepare
```

### Step 2 — Train
Trains a YOLOv8n model to detect passport number regions.
```bash
python main.py train
```
Training takes ~30–60 minutes on CPU. Best model saved to `runs/train/passport_detector/weights/best.pt`.

### Step 3 — Extract
Runs YOLO detection + EasyOCR on passport images and saves results.
```bash
# Single image
python main.py extract --image raw_data/images/passport.jpg

# Entire folder
python main.py extract --folder raw_data/images/
```

---

## 📤 Output

Results are saved to `output/` as both JSON and CSV:

```json
[
  {
    "image": "(1).jpeg",
    "passport_number": "AB1234579",
    "name": "Mohammed Rashid Anwar",
    "dob": "13 JUL 1982",
    "nationality": "BGD",
    "yolo_confidence": 0.89
  }
]
```

---

## 📊 Model Performance (YOLOv8n)

| Metric | Score |
|--------|-------|
| mAP@50 | 99.5% |
| mAP@50-95 | 60.6% |
| Precision | 99.4% |
| Recall | 100% |
| Inference speed | 135ms / image (CPU) |

Trained on 50 passport images · 100 epochs · Intel Core i5-8365U CPU

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| [YOLOv8](https://github.com/ultralytics/ultralytics) | Passport number region detection |
| [EasyOCR](https://github.com/JaidedAI/EasyOCR) | Text recognition from detected regions |
| [LabelImg](https://github.com/HumanSignal/labelImg) | Manual bounding box annotation |
| OpenCV | Image loading and preprocessing |
| Python 3.11 | Core language |

---

## 🔮 Roadmap

- [ ] Expand dataset to 200+ images for better recall
- [ ] Add MRZ (Machine Readable Zone) detection as a second class
- [ ] Improve OCR accuracy with image preprocessing (deskew, sharpen)
- [ ] Build a simple web UI with Flask or Streamlit
- [ ] Export model to ONNX for faster CPU inference

---

## ⚠️ Privacy Notice

The passport images used in this project are for educational purposes only.

---

## 📄 License

Internal project. All rights reserved by the authors.

