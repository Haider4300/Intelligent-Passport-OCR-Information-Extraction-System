"""
STEP 2 — YOLO Model Training Script
======================================
This script trains a YOLOv8 model on your passport dataset.
It learns to DETECT the bounding box of the passport number region.

Run AFTER prepare_dataset.py.
Usage:
    python train.py

Requirements:
    pip install ultralytics
"""

from pathlib import Path
from ultralytics import YOLO

# ─── CONFIG ────────────────────────────────────────────────────────────────────
DATA_YAML   = "dataset/data.yaml"   # Path to your dataset config
MODEL       = "yolov8n.pt"          # yolov8n = nano (smallest/fastest, good for 50 images)
                                    # Options: yolov8n, yolov8s, yolov8m (larger = slower but more accurate)
EPOCHS      = 100                   # How many training rounds (100 is good for small datasets)
IMAGE_SIZE  = 640                   # Input image size (standard YOLO size)
BATCH_SIZE  = 8                     # How many images per batch (reduce to 4 if you get memory errors)
PROJECT     = "runs/train"          # Where results will be saved
RUN_NAME    = "passport_detector"   # Name of this training run
# ───────────────────────────────────────────────────────────────────────────────


def train():
    print("\n🚀 Starting YOLO training...\n")
    print(f"   Model:      {MODEL}")
    print(f"   Dataset:    {DATA_YAML}")
    print(f"   Epochs:     {EPOCHS}")
    print(f"   Image size: {IMAGE_SIZE}px")
    print(f"   Batch size: {BATCH_SIZE}\n")

    # Load a pre-trained YOLOv8 model (downloads automatically on first run)
    model = YOLO(MODEL)

    # Train on your passport dataset
    results = model.train(
        data      = DATA_YAML,
        epochs    = EPOCHS,
        imgsz     = IMAGE_SIZE,
        batch     = BATCH_SIZE,
        project   = PROJECT,
        name      = RUN_NAME,
        patience  = 20,          # Stop early if no improvement after 20 epochs
        save      = True,        # Save best and last checkpoints
        plots     = True,        # Save training plots (loss curves, etc.)
        verbose   = True,
    )

    # The best model weights are saved here:
    best_weights = Path(PROJECT) / RUN_NAME / "weights" / "best.pt"
    print(f"\n✅ Training complete!")
    print(f"   Best model saved at: {best_weights.resolve()}")
    print(f"   Next step → run: python extract.py\n")

    return str(best_weights)


if __name__ == "__main__":
    train()