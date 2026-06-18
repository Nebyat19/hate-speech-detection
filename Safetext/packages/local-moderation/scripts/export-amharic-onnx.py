#!/usr/bin/env python3
"""Export uhhlt/amharic-hate-speech to ONNX for @xenova/transformers (run once)."""
from pathlib import Path
import json

from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

MODEL_ID = "uhhlt/amharic-hate-speech"
OUT = Path(__file__).resolve().parent.parent / ".amharic-hate-speech"

print(f"Exporting {MODEL_ID} → {OUT}")
OUT.mkdir(parents=True, exist_ok=True)

model = ORTModelForSequenceClassification.from_pretrained(MODEL_ID, export=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model.save_pretrained(OUT)
tokenizer.save_pretrained(OUT)

compat_dir = OUT / "onnx"
compat_dir.mkdir(parents=True, exist_ok=True)
compat_model = compat_dir / "model.onnx"
if not compat_model.exists():
	compat_model.symlink_to(Path("..") / "model.onnx")

tokenizer_path = OUT / "tokenizer.json"
if tokenizer_path.exists():
	payload = json.loads(tokenizer_path.read_text())
	merges = payload.get("model", {}).get("merges")
	if merges and isinstance(merges[0], list):
		payload["model"]["merges"] = [" ".join(pair) for pair in merges]
		tokenizer_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")

print("Done. Restart the server or re-run smoke:test.")
