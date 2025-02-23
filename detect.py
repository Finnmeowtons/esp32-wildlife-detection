import sys
import json
import torch
from PytorchWildlife.models import detection as pw_detection

# Set device
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

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
    
    return json.dumps(detection_data)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    print(detect(image_path))
