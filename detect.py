import sys
import json
import torch
import os
from PytorchWildlife.models import detection as pw_detection

# Set device
DEVICE = "cpu"

# Load the MegaDetectorV6 model
model = pw_detection.MegaDetectorV6(device=DEVICE, pretrained=True, version="MDV6-yolov10-e")

def detect(image_path):
    # Perform detection
    results = model.single_image_detection(image_path)
    
    # Check if any detected labels contain 'animal'
    labels = results.get("labels", [])
    has_animal = any("animal" in label.lower() for label in labels)
    
    detection_data = {
        "image": image_path,
        "has_animal": has_animal
    }
    
    return {"image": image_path, "has_animal": has_animal}


if __name__ == "__main__":
    upload_folder = "uploads"
    detections = {}

    for filename in os.listdir(upload_folder):
        if filename.endswith(".jpg"):
            image_path = os.path.join(upload_folder, filename)
            detections[filename] = detect(image_path)

    print(json.dumps(detections))
