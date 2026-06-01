"""
database.py — SQLite database setup
=====================================
We use SQLite (a file-based database) because:
  - No separate server to install or run
  - All data stored in one file: passport_ocr.db
  - Perfect for this project size
  - Easy to upgrade to PostgreSQL later if needed

SQLAlchemy is the library that lets Python "talk" to the database
without writing raw SQL queries.
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# ─── DATABASE CONNECTION ────────────────────────────────────────────────────────
# SQLite stores everything in a single file next to this script
# The "///" means "relative path" — so it creates passport_ocr.db here
DATABASE_URL = "sqlite:///./passport_ocr.db"

# Create the "engine" — the connection to the database file
# check_same_thread=False is required for SQLite to work with FastAPI
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# SessionLocal is a "factory" for database sessions
# Each API request gets its own session, then closes it when done
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class that all our database table models inherit from
Base = declarative_base()
# ────────────────────────────────────────────────────────────────────────────────


# ─── DATABASE TABLE DEFINITION ─────────────────────────────────────────────────
class ScanRecord(Base):
    """
    This class = one row in the 'scan_records' table.
    Each column is defined as a class attribute.
    """
    __tablename__ = "scan_records"  # Name of the table in SQLite

    # Primary key — auto-incremented integer ID
    id              = Column(Integer, primary_key=True, index=True)

    # Passport fields (stored as text)
    passport_number = Column(String, default="Not Found")
    name            = Column(String, default="Not Found")
    date_of_birth   = Column(String, default="Not Found")
    nationality     = Column(String, default="Not Found")

    # Metadata about the OCR process
    yolo_confidence = Column(Float,   default=0.0)   # 0.0 → 1.0
    yolo_detected   = Column(Boolean, default=False)  # Was YOLO used?
    filename        = Column(String,  default="")     # Original filename

    # Timestamp — auto-set to "now" when a record is created
    processed_at    = Column(DateTime, default=datetime.utcnow)
# ────────────────────────────────────────────────────────────────────────────────


def create_tables():
    """
    Create all database tables if they don't exist yet.
    Called once when the FastAPI app starts.
    Safe to call multiple times — won't overwrite existing data.
    """
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    Dependency function for FastAPI.
    FastAPI calls this automatically for each request that needs the DB.
    It creates a session, gives it to the route, then closes it after.

    The 'yield' keyword makes this a "generator" — code after yield
    runs as cleanup even if an error occurs.
    """
    db = SessionLocal()
    try:
        yield db        # ← give the session to the route function
    finally:
        db.close()      # ← always close it when done