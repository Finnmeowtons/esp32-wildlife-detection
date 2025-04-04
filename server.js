const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage });

app.get('/test', (req, res) => {
    res.json({ message: 'Server is working!' });
  });

app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }

    const imagePath = path.join(__dirname, 'uploads', req.file.filename);

    console.log(`Received image: ${imagePath}`);

    const pythonProcess = spawn('C:\\Users\\CJ Soriano\\.conda\\envs\\pytorch-wildlife\\python.exe', ['detect.py', imagePath]);
    // const pythonProcess = spawn('python3', ['detect.py', imagePath]);

    let result = '';
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Raw Python output: ${data.toString()}`);
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        console.log('Full output from Python:', result);

        //extract last line
        const lines = result.trim().split("\n");
        const lastLine = lines[lines.length - 1];

        try {
            const responseData = JSON.parse(lastLine);
            res.json(responseData);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            res.status(500).json({ error: 'Failed to process image' });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});