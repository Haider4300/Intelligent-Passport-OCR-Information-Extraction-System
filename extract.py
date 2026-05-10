"""
STEP 3 — Passport Information Extractor
==========================================
This script:
1. Takes a passport image (or a folder of images)
2. Uses your trained YOLO model to DETECT the passport number region
3. Uses EasyOCR to READ the text from the detected region
4. Uses EasyOCR on the FULL image to extract: name, DOB, nationality
5. Saves results to output/results.json and output/results.csv

Run AFTER training is complete.
Usage:
    # Single image:
    python extract.py --image path/to/passport.jpg

    # Entire folder:
    python extract.py --folder path/to/folder/

Requirements:
    pip install ultralytics easyocr opencv-python pillow
"""

import argparse
import json
import re
import csv
from pathlib import Path
from datetime import datetime

import cv2
import easyocr
from ultralytics import YOLO

# ─── CONFIG ────────────────────────────────────────────────────────────────────
DEFAULT_MODEL  = "runs/train/passport_detector/weights/best.pt"
OUTPUT_DIR     = Path("output")
CONFIDENCE     = 0.25    # Minimum YOLO detection confidence (0-1)
# ───────────────────────────────────────────────────────────────────────────────


# ─── OCR READER (loaded once, reused for all images) ───────────────────────────
print("⏳ Loading EasyOCR... (first run downloads language model ~100MB)")
reader = easyocr.Reader(['en'], gpu=False)  # Set gpu=True if you have a GPU
print("✅ EasyOCR loaded.\n")


# ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

def load_model(model_path: str) -> YOLO:
    """Load the trained YOLO model."""
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(
            f"❌ Model not found at: {path}\n"
            f"   Have you run train.py yet?"
        )
    print(f"✅ YOLO model loaded from: {path}")
    return YOLO(str(path))


def detect_passport_number_region(model: YOLO, image_path: str):
    """
    Run YOLO on the image to detect the passport number bounding box.
    Returns the cropped image region (numpy array) or None if not found.
    """
    results = model(image_path, conf=CONFIDENCE, verbose=False)
    img = cv2.imread(image_path)
    h, w = img.shape[:2]

    best_crop  = None
    best_conf  = 0.0

    for result in results:
        for box in result.boxes:
            conf = float(box.conf[0])
            if conf > best_conf:
                best_conf = conf
                # Convert YOLO box (x1,y1,x2,y2) to pixel coords
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                # Add small padding around the crop
                pad = 5
                x1 = max(0, x1 - pad)
                y1 = max(0, y1 - pad)
                x2 = min(w, x2 + pad)
                y2 = min(h, y2 + pad)
                best_crop = img[y1:y2, x1:x2]

    return best_crop, best_conf


def ocr_text_from_region(crop) -> str:
    """Run EasyOCR on a cropped image region and return cleaned text."""
    if crop is None or crop.size == 0:
        return ""
    results = reader.readtext(crop, detail=0)   # detail=0 → only text, no boxes
    text = " ".join(results).strip()
    # Clean up: remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    return text


def ocr_full_image(image_path: str) -> str:
    """Run EasyOCR on the FULL passport image and return all detected text."""
    img = cv2.imread(image_path)
    results = reader.readtext(img, detail=0)
    return " ".join(results)


# ─── FIELD EXTRACTION FROM FULL TEXT ───────────────────────────────────────────

def extract_passport_number(text: str) -> str:
    """
    Passport numbers are typically: 1-2 letters followed by 6-7 digits
    e.g.  AB1234567  or  A12345678
    """
    pattern = r'\b[A-Z]{1,2}[0-9]{6,8}\b'
    matches = re.findall(pattern, text.upper())
    return matches[0] if matches else "Not Found"


def extract_dob(text: str) -> str:
    """
    Date of birth patterns:
    - DD MMM YYYY  (e.g. 15 JAN 1990)
    - DD/MM/YYYY   (e.g. 15/01/1990)
    - DD-MM-YYYY   (e.g. 15-01-1990)
    - YYYYMMDD     (e.g. 19900115) — MRZ format
    """
    patterns = [
        r'\b(\d{2}[\s/\-][A-Z]{3}[\s/\-]\d{4})\b',   # 15 JAN 1990
        r'\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b',           # 15/01/1990
        r'\b(\d{4}[/\-]\d{2}[/\-]\d{2})\b',           # 1990/01/15
    ]
    for pattern in patterns:
        matches = re.findall(pattern, text.upper())
        if matches:
            return matches[0]
    return "Not Found"


def extract_name(text: str) -> str:
    """
    Passport names often appear after keywords like 'SURNAME', 'NAME',
    or in the MRZ zone (two lines of uppercase letters with << separators).
    """
    # Try to find MRZ-style name: P<COUNTRYNAME<<FIRSTNAME<MIDDLENAME
    mrz_pattern = r'P[<A-Z]{3}([A-Z]+)<<([A-Z<]+)'
    mrz_match = re.search(mrz_pattern, text.upper().replace(' ', ''))
    if mrz_match:
        surname   = mrz_match.group(1)
        firstname = mrz_match.group(2).replace('<', ' ').strip()
        return f"{firstname} {surname}".title()

    # Fallback: look for text after SURNAME or NAME label
    name_pattern = r'(?:SURNAME|LAST\s*NAME|FAMILY\s*NAME)[:\s]+([A-Z\s]+?)(?:\n|DOB|DATE|NAT)'
    name_match = re.search(name_pattern, text.upper())
    if name_match:
        return name_match.group(1).strip().title()

    return "Not Found"


def extract_nationality(text: str) -> str:
    """
    Look for nationality/country code.
    MRZ has 3-letter country codes (e.g. PAK, IND, USA, GBR).
    Labels like 'NATIONALITY' may also appear.
    """
    # Look for explicit NATIONALITY label
    nat_pattern = r'(?:NATIONALITY|NATION)[:\s]+([A-Z\s]{3,20}?)(?:\n|DOB|DATE|SEX|GENDER)'
    nat_match = re.search(nat_pattern, text.upper())
    if nat_match:
        return nat_match.group(1).strip().title()

    # Fallback: 3-letter ISO country codes that commonly appear in passports
    known_codes = [
        'PAK', 'IND', 'USA', 'GBR', 'CAN', 'AUS', 'UAE', 'SAU',
        'EGY', 'NGA', 'BGD', 'LKA', 'NPL', 'PHL', 'IDN', 'MYS',
        'TUR', 'IRN', 'AFG', 'DEU', 'FRA', 'ITA', 'ESP', 'NLD',
        'CHN', 'JPN', 'KOR', 'BRA', 'MEX', 'ZAF', 'KEN', 'ETH',
    ]
    text_upper = text.upper()
    for code in known_codes:
        if re.search(r'\b' + code + r'\b', text_upper):
            return code

    return "Not Found"


# ─── MAIN EXTRACTION PIPELINE ──────────────────────────────────────────────────

def process_image(model: YOLO, image_path: str) -> dict:
    """
    Full pipeline for a single passport image.
    Returns a dict with all extracted fields.
    """
    print(f"\n📄 Processing: {Path(image_path).name}")

    # Step 1: Detect passport number region with YOLO
    crop, conf = detect_passport_number_region(model, image_path)

    # Step 2: OCR on the detected region → passport number
    if crop is not None:
        passport_number = ocr_text_from_region(crop)
        print(f"   YOLO confidence:  {conf:.2f}")
        print(f"   Passport number:  {passport_number}")
    else:
        print(f"   ⚠️  YOLO did not detect a region (conf < {CONFIDENCE}). Falling back to full-image OCR.")
        passport_number = "Not Detected"

    # Step 3: OCR on full image → extract other fields
    full_text = ocr_full_image(image_path)

    # Step 4: Parse fields from full text
    # If YOLO found a number already, use it; otherwise try regex on full text
    if passport_number in ("Not Detected", ""):
        passport_number = extract_passport_number(full_text)

    name        = extract_name(full_text)
    dob         = extract_dob(full_text)
    nationality = extract_nationality(full_text)

    print(f"   Name:             {name}")
    print(f"   Date of Birth:    {dob}")
    print(f"   Nationality:      {nationality}")

    return {
        "image"          : Path(image_path).name,
        "passport_number": passport_number,
        "name"           : name,
        "dob"            : dob,
        "nationality"    : nationality,
        "yolo_confidence": round(conf, 3),
    }


def save_results(results: list):
    """Save results to both JSON and CSV files."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # ── JSON ──────────────────────────────────────────────
    json_path = OUTPUT_DIR / f"results_{timestamp}.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n✅ JSON saved: {json_path}")

    # ── CSV ───────────────────────────────────────────────
    csv_path = OUTPUT_DIR / f"results_{timestamp}.csv"
    if results:
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
    print(f"✅ CSV  saved: {csv_path}")

    return json_path, csv_path


# ─── CLI ENTRYPOINT ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Passport Information Extractor")
    parser.add_argument("--model",  default=DEFAULT_MODEL,  help="Path to trained YOLO weights")
    parser.add_argument("--image",  default=None,           help="Path to a single passport image")
    parser.add_argument("--folder", default=None,           help="Path to a folder of passport images")
    args = parser.parse_args()

    if not args.image and not args.folder:
        parser.print_help()
        print("\n❌ Please provide --image or --folder argument.")
        return

    # Load model
    model = load_model(args.model)

    # Collect image paths
    image_paths = []
    if args.image:
        image_paths = [args.image]
    elif args.folder:
        folder = Path(args.folder)
        image_paths = [
            str(p) for p in sorted(folder.iterdir())
            if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp"}
        ]
        print(f"Found {len(image_paths)} images in folder.")

    if not image_paths:
        print("❌ No images found.")
        return

    # Process all images
    all_results = []
    for img_path in image_paths:
        result = process_image(model, img_path)
        all_results.append(result)

    # Save outputs
    save_results(all_results)

    print("\n🎉 All done!")
    print(f"   Processed {len(all_results)} passport(s).")


if __name__ == "__main__":
    main()