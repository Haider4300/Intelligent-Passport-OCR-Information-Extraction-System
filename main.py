"""
comp-vision-project — Main Entry Point
========================================
Passport Information Extraction using YOLOv8 + EasyOCR

Full Pipeline:
    1. prepare_dataset.py  →  Organizes raw data into YOLO format
    2. train.py            →  Trains YOLOv8 to detect passport number region
    3. extract.py          →  Detects + reads: passport_number, name, dob, nationality

Quick start:
    python main.py --help
    python main.py prepare
    python main.py train
    python main.py extract --image path/to/passport.jpg
    python main.py extract --folder path/to/folder/
"""

import sys
import subprocess

COMMANDS = {
    "prepare" : ("prepare_dataset.py", "Organize raw_data/ into train/val dataset"),
    "train"   : ("train.py",           "Train YOLOv8 on your passport dataset"),
    "extract" : ("extract.py",         "Extract info from passport image(s)"),
}


def print_help():
    print("\n🛂  Passport OCR — Vision Project")
    print("=" * 42)
    print("Usage:  python main.py <command> [options]\n")
    print("Commands:")
    for cmd, (_, desc) in COMMANDS.items():
        print(f"  {cmd:<10} {desc}")
    print("\nExamples:")
    print("  python main.py prepare")
    print("  python main.py train")
    print("  python main.py extract --image raw_data/images/passport1.jpg")
    print("  python main.py extract --folder raw_data/images/\n")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print_help()
        return

    command = sys.argv[1]
    if command not in COMMANDS:
        print(f"❌ Unknown command: '{command}'")
        print_help()
        return

    script, desc = COMMANDS[command]
    print(f"\n▶  Running: {desc}\n")

    # Pass through any extra arguments (e.g. --image, --folder)
    extra_args = sys.argv[2:]
    subprocess.run([sys.executable, script] + extra_args, check=True)


if __name__ == "__main__":
    main()