"""
main.py — FastAPI Application Server
======================================
This is the entry point for the backend.
It defines all the API routes (URLs) that the frontend will call.

Routes:
  GET  /health          → Check if the server and models are running
  POST /api/extract     → Upload a passport image, get extracted data back
  GET  /api/history     → Get all past scan results
  GET  /api/history/{id} → Get one specific scan result
  DELETE /api/history/{id} → Delete a scan result

Run with:
  uvicorn main:app --reload --port 8000
  (--reload means it restarts automatically when you save changes)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

# Import our own modules
from ocr_service import PassportOCRService
from database import create_tables, get_db, ScanRecord
from models import OCRResult, OCRResultSummary, HealthCheck


# ─── APP SETUP ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Passport OCR API",
    description="Upload passport images and extract structured data using YOLOv8 + EasyOCR",
    version="1.0.0"
)

# ── CORS (Cross-Origin Resource Sharing) ───────────────────────────────────────
# This allows our React frontend (running on port 5173) to make requests
# to this backend (running on port 8000).
# Without this, the browser would block the request for security reasons.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],   # Allow GET, POST, DELETE, etc.
    allow_headers=["*"],   # Allow all headers
)

# ─── STARTUP ───────────────────────────────────────────────────────────────────

# Create database tables when the server starts
create_tables()

# Load the OCR service (YOLO + EasyOCR) ONCE at startup
# This is slow (~10-15 seconds) but only happens once
print("🚀 Loading AI models at startup...")
ocr_service = PassportOCRService()
print("✅ All models loaded. Server is ready!\n")

# ─── ALLOWED IMAGE TYPES ───────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {"image/jpeg", "image/jpg", "image/png", "image/bmp"}


# ─── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthCheck, tags=["System"])
def health_check():
    """
    Health check endpoint.
    The frontend calls this on load to verify the backend is running
    and to check if the YOLO model is available.
    """
    yolo_ready = ocr_service.model is not None
    return {
        "status":      "ok",
        "yolo_loaded": yolo_ready,
        "message":     "YOLO model ready" if yolo_ready else
                       "YOLO model not found — using regex fallback only. Run train.py first."
    }


@app.post("/api/extract", response_model=OCRResult, tags=["OCR"])
async def extract_passport(
    file: UploadFile = File(...),       # The uploaded image file
    db:   Session    = Depends(get_db)  # DB session (auto-injected by FastAPI)
):
    """
    Main endpoint — accepts a passport image and returns extracted data.

    Steps:
    1. Validate the uploaded file is an image
    2. Read the file bytes
    3. Pass bytes to OCR service for processing
    4. Save result to database
    5. Return result as JSON
    """

    # ── Validate file type ────────────────────────────────────────────────────
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Please upload a JPG or PNG image."
        )

    # ── Read file bytes from the upload ───────────────────────────────────────
    image_bytes = await file.read()

    # Check file isn't empty
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── Run OCR pipeline ──────────────────────────────────────────────────────
    try:
        result = ocr_service.process_image(image_bytes)
    except ValueError as e:
        # process_image raises ValueError if image can't be decoded
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        # Catch any unexpected errors from the OCR process
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    # ── Save to database ──────────────────────────────────────────────────────
    # Create a new database row with the extracted data
    db_record = ScanRecord(
        passport_number = result["passport_number"],
        name            = result["name"],
        date_of_birth   = result["date_of_birth"],
        nationality     = result["nationality"],
        yolo_confidence = result["yolo_confidence"],
        yolo_detected   = result["yolo_detected"],
        filename        = file.filename or "unknown",
        processed_at    = datetime.utcnow(),
    )

    db.add(db_record)    # Stage the new record
    db.commit()          # Write it to the database file
    db.refresh(db_record)  # Reload it so we get the auto-assigned 'id'

    return db_record  # FastAPI auto-converts this to JSON using OCRResult schema


@app.get("/api/history", response_model=List[OCRResultSummary], tags=["History"])
def get_history(
    skip:  int = 0,    # How many records to skip (for pagination)
    limit: int = 50,   # Max records to return
    db: Session = Depends(get_db)
):
    """
    Returns a list of all past passport scans, newest first.
    Used to populate the history table in the frontend.
    """
    records = (
        db.query(ScanRecord)
        .order_by(ScanRecord.processed_at.desc())  # Newest first
        .offset(skip)
        .limit(limit)
        .all()
    )
    return records


@app.get("/api/history/{record_id}", response_model=OCRResult, tags=["History"])
def get_single_record(record_id: int, db: Session = Depends(get_db)):
    """
    Returns the full details for a single scan by its ID.
    Used when the user clicks on a row in the history table.
    """
    record = db.query(ScanRecord).filter(ScanRecord.id == record_id).first()

    if record is None:
        raise HTTPException(status_code=404, detail=f"Record with ID {record_id} not found.")

    return record


@app.delete("/api/history/{record_id}", tags=["History"])
def delete_record(record_id: int, db: Session = Depends(get_db)):
    """
    Deletes a single scan record from the database.
    Used by the delete button in the history table.
    """
    record = db.query(ScanRecord).filter(ScanRecord.id == record_id).first()

    if record is None:
        raise HTTPException(status_code=404, detail=f"Record with ID {record_id} not found.")

    db.delete(record)
    db.commit()

    # Return a simple success message
    return {"message": f"Record {record_id} deleted successfully."}