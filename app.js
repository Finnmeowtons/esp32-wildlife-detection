const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const mqtt = require("mqtt");
const mqttClient = mqtt.connect("mqtt://157.245.204.46:1883");

const app = express();
const PORT = 3000;

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mqttClient.on("connect", () => {
    console.log("Connected to MQTT broker (from app.js)");
});

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Function to run detect.py
const runDetection = (imagePath) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn("bash", ["-c", `source venv/bin/activate && python3 detect.py '${imagePath}'`]);
        let result = "";
        pythonProcess.stdout.on("data", (data) => {
            console.log(`Python Output: ${data.toString()}`);
            result += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            console.error(`Python Error: ${data}`);
        });

        pythonProcess.on("close", (code) => {
            console.log(`Python process exited with code ${code}`);
            try {
                // Get the last non-empty line (assumed to be JSON)
                const lines = result.trim().split("\n").filter(Boolean);
                const lastLine = lines[lines.length - 1];
                const responseData = JSON.parse(lastLine);
                resolve(responseData);
            } catch (error) {
                reject("Error parsing detection result");
            }
        });
    });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const device = req.query.device || "unknown"; // Get device ID from request
        cb(null, `${device}.jpg`); // Save as "device1.jpg", "device2.jpg", etc.
    }
});

const upload = multer({ storage });

// Route to handle image uploads
app.post("/upload", upload.single("imageFile"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const device = req.query.device || "unknown";
    const imagePath = `./uploads/${req.file.filename}`;

    console.log(`Image received from ${device}: ${req.file.filename}`);

    try {
        const detectionResult = await runDetection(imagePath);

        // MQTT Publish
        mqttClient.publish("mais/animal", JSON.stringify({
            device: device,
            image: req.file.filename,
            has_animal: detectionResult.has_animal
        }));

        res.status(200).json({
            message: "Image uploaded and detection complete!",
            filename: req.file.filename,
            result: detectionResult
        });
    } catch (err) {
        console.error("Detection error:", err);
        res.status(500).json({ message: "Detection failed", error: err });
    }
});

// Serve image for a specific device
app.get("/image/:deviceId", (req, res) => {
    const deviceId = req.params.deviceId;
    const imagePath = path.join(__dirname, "uploads", `${deviceId}.jpg`);

    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ message: "Image not found for this device." });
        }
        res.sendFile(imagePath);
    });
});

app.get("/images", (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ message: "Failed to list images" });
        }

        const imageUrls = files.map(file => ({
            filename: file,
            url: `http://localhost:${PORT}/uploads/${file}`
        }));

        res.json(imageUrls);
    });
});






app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
