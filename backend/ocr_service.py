"""
ocr_service.py — The "brain" of our backend.
=============================================
OCR pipeline:
  1. YOLO  → crops passport number region
  2. EasyOCR → reads MRZ zone + full image
  3. MRZ parser → extracts all fields
  4. Regex fallback → fills any missing field
"""

import re
import cv2
import numpy as np
import easyocr
from pathlib import Path
from ultralytics import YOLO

# ─── CONFIG ────────────────────────────────────────────────────────────────────
DEFAULT_MODEL_PATH = str(
    Path(__file__).parent.parent / "runs" / "train" / "passport_detector" / "weights" / "best.pt"
)
YOLO_CONFIDENCE = 0.25
# ───────────────────────────────────────────────────────────────────────────────


class PassportOCRService:

    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        print("⏳ Loading EasyOCR reader...")
        self.reader = easyocr.Reader(['en'], gpu=False)
        print("✅ EasyOCR ready.")
        self.model = self._load_yolo_model(model_path)

    def _load_yolo_model(self, model_path: str):
        path = Path(model_path)
        if path.exists():
            print(f"✅ YOLO model loaded from: {path}")
            return YOLO(str(path))
        print(f"⚠️  YOLO model not found at: {path}")
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # IMAGE HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    def _enhance_image(self, image: np.ndarray) -> np.ndarray:
        """
        Sharpen image before OCR.
        Grayscale → CLAHE → Denoise → Sharpen → BGR
        """
        # Step 1: grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Step 2: adaptive contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray  = clahe.apply(gray)

        # Step 3: denoise
        denoised = cv2.fastNlMeansDenoising(gray, h=10)

        # Step 4: sharpen — dtype=np.float32 avoids the array ambiguity error
        kernel   = np.array([[0, -1, 0],
                              [-1, 5, -1],
                              [0, -1, 0]], dtype=np.float32)
        sharp    = cv2.filter2D(denoised, ddepth=-1, kernel=kernel)

        # Ensure valid uint8 pixel range before converting back to BGR
        sharp = np.clip(sharp, 0, 255).astype(np.uint8)

        return cv2.cvtColor(sharp, cv2.COLOR_GRAY2BGR)

    def _crop_mrz_region(self, image: np.ndarray) -> np.ndarray:
        """
        Crop bottom 22% of passport image — the MRZ lines always live here.
        Isolating them removes noisy Bengali/Arabic body text from OCR.
        """
        h, w = image.shape[:2]
        return image[int(h * 0.78):h, 0:w]

    # ──────────────────────────────────────────────────────────────────────────
    # YOLO DETECTION
    # ──────────────────────────────────────────────────────────────────────────

    def detect_passport_region(self, image_array: np.ndarray):
        """Use YOLO to find and crop the passport number bounding box."""
        if self.model is None:
            return None, 0.0

        h, w      = image_array.shape[:2]
        best_crop = None
        best_conf = 0.0

        results = self.model(image_array, conf=YOLO_CONFIDENCE, verbose=False)
        for result in results:
            for box in result.boxes:
                conf = float(box.conf[0])
                if conf > best_conf:
                    best_conf = conf
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    pad = 5
                    x1 = max(0, x1 - pad); y1 = max(0, y1 - pad)
                    x2 = min(w, x2 + pad); y2 = min(h, y2 + pad)
                    best_crop = image_array[y1:y2, x1:x2]

        return best_crop, best_conf

    # ──────────────────────────────────────────────────────────────────────────
    # OCR READING
    # ──────────────────────────────────────────────────────────────────────────

    def read_text_from_region(self, region: np.ndarray) -> str:
        """Run EasyOCR on a small cropped region."""
        if region is None or region.size == 0:
            return ""
        results = self.reader.readtext(region, detail=0)
        return re.sub(r'\s+', ' ', " ".join(results).strip())

    def read_full_image(self, image: np.ndarray) -> str:
        """Run EasyOCR on the full image, return all text joined."""
        results = self.reader.readtext(image, detail=0)
        return " ".join(results)

    # ──────────────────────────────────────────────────────────────────────────
    # MRZ PARSING
    # ──────────────────────────────────────────────────────────────────────────

    def _clean_mrz(self, raw: str) -> str:
        """
        Clean EasyOCR output into a pure MRZ string.
        - Remove spaces (EasyOCR inserts them between chars)
        - Normalize bracket chars to <
        - Keep only valid MRZ chars: A-Z, 0-9, <
        """
        joined = str(raw).upper().replace(' ', '')
        joined = joined.replace('(', '<').replace(')', '<')
        return re.sub(r'[^A-Z0-9<]', '<', joined)

    def _parse_mrz_date(self, yymmdd: str) -> str:
        """
        Convert MRZ date YYMMDD → "DD MON YYYY".
        ICAO century rule: YY >= 25 → 1900s, YY < 25 → 2000s
        """
        months = {
            '01':'JAN','02':'FEB','03':'MAR','04':'APR',
            '05':'MAY','06':'JUN','07':'JUL','08':'AUG',
            '09':'SEP','10':'OCT','11':'NOV','12':'DEC'
        }
        try:
            yy   = int(yymmdd[0:2])
            mm   = yymmdd[2:4]
            dd   = yymmdd[4:6]
            year = 1900 + yy if yy >= 25 else 2000 + yy
            if not (1 <= int(dd) <= 31): return None
            if mm not in months:         return None
            return f"{dd} {months[mm]} {year}"
        except (ValueError, IndexError):
            return None

    def _fix_name_artifacts(self, name_part: str) -> str:
        """
        Fix EasyOCR MRZ name artifacts:

        1. Remove 1-2 char words      "John Eh Carter"    → "John Carter"
        2. Strip leading D/C          "Dsikder"           → "Sikder"
        3. Remove repeated-letter words "Kkk", "Ccc"      → removed
           (EasyOCR reads <<<< filler as repeated letters)
        4. Remove words that are mostly the same letter
           e.g. "Kkkkk", "Ssec" with 3+ same consecutive chars → removed
        """
        words = name_part.split()
        cleaned = []

        for w in words:
            # Rule 1: skip 1-2 char words
            if len(w) <= 2:
                continue

            # Rule 3+4: skip words that look like repeated-char MRZ filler
            # e.g. "Kkk", "Cccc", "Ssssec" — any word where one letter
            # appears more than half the time is likely garbage
            upper_w = w.upper()
            if len(upper_w) >= 3:
                # Check if any single character makes up >50% of the word
                dominant = max(set(upper_w), key=upper_w.count)
                if upper_w.count(dominant) > len(upper_w) * 0.5:
                    continue

                # Also skip words with 3+ consecutive same letters e.g. "Kkk"
                if re.search(r'(.)\1{2,}', upper_w):
                    continue

            # Rule 2: strip leading D/C artifact
            # e.g. "Dsikder" → "Sikder"
            unlikely_after = set('SHMRKNBPTLFGJCWVZ')
            if (len(w) > 3
                    and w[0].upper() in ('D', 'C')
                    and w[1].upper() in unlikely_after):
                w = w[1:]

            cleaned.append(w)

        return ' '.join(cleaned)

    def parse_mrz(self, mrz_raw: str) -> dict:
        """
        Parse MRZ text to extract passport fields.

        Works on the full cleaned MRZ string (not split into lines)
        because EasyOCR does not reliably preserve newlines.

        Line 1: P<CCC SURNAME << GIVENNAME <<<
        Line 2: PPPPPPPPP C CCC YYMMDD C S YYMMDD ...
        """
        result = {
            "passport_number": None,
            "name":            None,
            "nationality":     None,
            "date_of_birth":   None,
        }

        # Clean the raw OCR text into pure MRZ format
        cleaned = self._clean_mrz(mrz_raw)
        print(f"\n[DEBUG] Cleaned MRZ: {cleaned}\n")

        # ── Name from Line 1 (P<CCC...) ──────────────────────────────────────
        line1 = re.search(r'P[<A-Z][A-Z]{3}([A-Z<]{5,39})', cleaned)
        if line1:
            name_field = line1.group(1)
            if '<<' in name_field:
                surname_raw, given_raw = name_field.split('<<', 1)
                surname   = self._fix_name_artifacts(
                    surname_raw.replace('<', ' ').strip()
                )
                firstname = self._fix_name_artifacts(
                    given_raw.replace('<', ' ').strip()
                )
                full = f"{firstname} {surname}".strip().title()
                if len(full) > 3:
                    result["name"] = full

        # ── Passport number + nationality + DOB from Line 2 ──────────────────
        # Pattern breakdown:
        #   [A-Z][A-Z0-9]{7,8}  = passport number (starts with letter)
        #   [0-9<]               = check digit
        #   ([A-Z]{3})           = nationality  ← group 1
        #   (\d{6})              = DOB YYMMDD   ← group 2
        #   [0-9<]               = check digit
        line2 = re.search(
            r'([A-Z][A-Z0-9]{7,8})[0-9<]([A-Z]{3})(\d{6})[0-9<]',
            cleaned
        )
        if line2:
            result["passport_number"] = line2.group(1)
            result["nationality"]     = line2.group(2)
            result["date_of_birth"]   = self._parse_mrz_date(line2.group(3))

        return result

    # ──────────────────────────────────────────────────────────────────────────
    # REGEX FALLBACKS
    # ──────────────────────────────────────────────────────────────────────────

    def parse_passport_number(self, text: str) -> str:
        """Fallback: 1-2 letters + 6-8 digits."""
        t = str(text).upper()
        p = r'\b[A-Z]{1,2}[0-9]{6,8}\b'
        m = re.findall(p, t)
        if m:
            return m[0]
        # Fix common OCR digit/letter confusions at start
        fixed = re.sub(r'\b8([A-Z])', r'B\1', t)
        fixed = re.sub(r'\b0([A-Z])', r'O\1', fixed)
        m = re.findall(p, fixed)
        return m[0] if m else "Not Found"

    def parse_date_of_birth(self, text: str) -> str:
        """Fallback: find and validate printed date formats."""
        t = str(text).upper()
        for pattern in [
            r'\b(\d{2}[\s/\-][A-Z]{3}[\s/\-]\d{4})\b',
            r'\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b',
            r'\b(\d{4}[/\-]\d{2}[/\-]\d{2})\b',
        ]:
            for match in re.findall(pattern, t):
                nums = re.findall(r'\d+', match)
                year = next((int(n) for n in nums if len(n) == 4), None)
                day  = int(nums[0]) if nums else 0
                if year and 1900 <= year <= 2025 and 1 <= day <= 31:
                    return match
        return "Not Found"

    def parse_name(self, text: str) -> str:
        """Fallback: look for SURNAME / GIVEN NAME labels."""
        t = str(text).upper()
        for pattern in [
            r'(?:SURNAME|LAST\s*NAME)[:\s]+([A-Z][A-Z\s]{2,25}?)(?:\n|DOB|DATE|NAT|GIVEN|$)',
            r'(?:GIVEN\s*NAMES?|FIRST\s*NAME)[:\s]+([A-Z][A-Z\s]{2,25}?)(?:\n|DOB|DATE|NAT|$)',
        ]:
            m = re.search(pattern, t)
            if m:
                return m.group(1).strip().title()
        return "Not Found"

    def parse_nationality(self, text: str) -> str:
        """Fallback: ISO codes + full country names."""
        t = str(text).upper()
        m = re.search(
            r'(?:NATIONALITY|NATION)[:\s]+([A-Z\s]{3,20}?)(?:\n|DOB|DATE|SEX|GENDER|$)', t
        )
        if m:
            return m.group(1).strip().title()

        for code in ['PAK','IND','USA','GBR','CAN','AUS','UAE','SAU','EGY','NGA',
                     'BGD','LKA','NPL','PHL','IDN','MYS','TUR','IRN','AFG','DEU',
                     'FRA','ITA','ESP','NLD','CHN','JPN','KOR','BRA','MEX','ZAF']:
            if re.search(r'\b' + code + r'\b', t):
                return code

        for name, code in {
            'BANGLADESH':'BGD','BANGLADESHI':'BGD','PAKISTAN':'PAK',
            'INDIA':'IND','BRITISH':'GBR','UNITED KINGDOM':'GBR',
            'AMERICAN':'USA','UNITED STATES':'USA','CANADA':'CAN',
            'AUSTRALIA':'AUS','GERMANY':'DEU','FRANCE':'FRA',
        }.items():
            if name in t:
                return code

        return "Not Found"

    # ──────────────────────────────────────────────────────────────────────────
    # MAIN ENTRY POINT
    # ──────────────────────────────────────────────────────────────────────────

    def process_image(self, image_bytes: bytes) -> dict:
        """
        Full pipeline:
          1. Decode image bytes → OpenCV image
          2. YOLO → crop passport number region
          3. Crop bottom 22% → OCR the MRZ zone
          4. parse_mrz() → all fields from MRZ
          5. Regex fallback for any field MRZ missed
          6. Validate YOLO passport number
        """
        # ── Decode ────────────────────────────────────────────────────────────
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image. Please upload a valid JPG/PNG.")

        # ── YOLO: crop passport number region ─────────────────────────────────
        crop, confidence = self.detect_passport_region(image)

        # Read text from YOLO crop — ensure it's a plain string
        yolo_passport_number = ""
        if crop is not None:
            raw = self.read_text_from_region(crop)
            # read_text_from_region always returns str, but guard anyway
            yolo_passport_number = str(raw).strip() if raw is not None else ""

        # ── MRZ zone: crop bottom 22% and OCR ────────────────────────────────
        mrz_crop     = self._crop_mrz_region(image)
        mrz_enhanced = self._enhance_image(mrz_crop)
        mrz_raw_text = self.read_full_image(mrz_enhanced)
        # Ensure plain string
        mrz_raw_text = str(mrz_raw_text) if mrz_raw_text is not None else ""

        print(f"\n[DEBUG] MRZ raw OCR: {mrz_raw_text}\n")

        # ── Parse MRZ ─────────────────────────────────────────────────────────
        mrz = self.parse_mrz(mrz_raw_text)

        # ── Full image fallback if MRZ missed any field ───────────────────────
        full_text = ""
        if any(v is None for v in mrz.values()):
            enhanced_full = self._enhance_image(image)
            raw_full      = self.read_full_image(enhanced_full)
            full_text     = str(raw_full) if raw_full is not None else ""

        # ── Validate YOLO passport number ─────────────────────────────────────
        # Must be a plain string starting with a letter (not all-digit personal no.)
        yolo_valid = False
        if isinstance(yolo_passport_number, str) and yolo_passport_number:
            yolo_valid = bool(
                re.match(r'^[A-Z][A-Z0-9]{5,8}$',
                         yolo_passport_number.upper().strip())
            )

        # ── Assemble final results ────────────────────────────────────────────
        passport_number = (
            (yolo_passport_number if yolo_valid else None)
            or mrz["passport_number"]
            or self.parse_passport_number(full_text)
            or "Not Found"
        )
        name = (
            mrz["name"]
            or self.parse_name(full_text)
            or "Not Found"
        )
        dob = (
            mrz["date_of_birth"]
            or self.parse_date_of_birth(full_text)
            or "Not Found"
        )
        nationality = (
            mrz["nationality"]
            or self.parse_nationality(full_text)
            or "Not Found"
        )

        return {
            "passport_number": passport_number,
            "name":            name,
            "date_of_birth":   dob,
            "nationality":     nationality,
            "yolo_confidence": round(confidence, 3),
            "yolo_detected":   crop is not None,
        }