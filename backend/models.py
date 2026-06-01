"""
models.py — Data shapes for our API
=====================================
Pydantic models define the EXACT structure of data going in and out.
FastAPI uses these to validate data and generate API docs at /docs.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OCRResult(BaseModel):
    """Full result returned after processing a passport image."""
    id:               int
    passport_number:  str
    name:             str
    date_of_birth:    str
    nationality:      str
    yolo_confidence:  float
    yolo_detected:    bool
    filename:         str
    processed_at:     datetime

    class Config:
        from_attributes = True


class OCRResultSummary(BaseModel):
    """
    Summary used in the history table.
    Includes date_of_birth so the history table can show it.
    """
    id:              int
    passport_number: str
    name:            str
    date_of_birth:   str        # ← was missing before, now included
    nationality:     str
    filename:        str
    processed_at:    datetime

    class Config:
        from_attributes = True


class HealthCheck(BaseModel):
    """Returned by the /health endpoint."""
    status:       str
    yolo_loaded:  bool
    message:      str