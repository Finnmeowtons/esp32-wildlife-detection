const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Function to run detect.py
const runDetection = (imagePath) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn("C:\\Users\\CJ Soriano\\.conda\\envs\\pytorch-wildlife\\python.exe", ["detect.py", imagePath]);

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
                const responseData = JSON.parse(result.trim());
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
app.post("/upload", upload.single("imageFile"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    console.log(`Image received from ${req.query.device || "unknown"}: ${req.file.filename}`);
    res.status(200).json({ message: "Image uploaded successfully!", filename: req.file.filename });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
