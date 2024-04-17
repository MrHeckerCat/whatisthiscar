const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const Multer = require('multer');
const {Storage} = require('@google-cloud/storage');
const fs = require('fs');

// Replace with your actual Gemini API key and GCP project ID
const GEMINI_API_KEY = '';
const GCP_PROJECT_ID = 'theta-maker-418212';

// Multer configuration
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GCP Storage client
const storage = new Storage({projectId: GCP_PROJECT_ID});
const bucketName = 'whatisthiscartest';
const bucket = storage.bucket(bucketName);

const app = express();
app.use(bodyParser.json());

// Endpoint for file upload
app.post('/api/upload', multer.single('image'), async (req, res) => {
  try {
    console.log('File upload request received.');
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // File type validation (example for JPEG images)
    if (req.file.mimetype !== 'image/jpeg') {
      return res.status(400).send('Invalid file type. Only JPEG images are allowed.');
    }

    // Upload file to GCP bucket
    console.log('Uploading file to GCP bucket...');
    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream();
    blobStream.end(req.file.buffer);

    // Get public URL of the uploaded file
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${req.file.originalname}`;
    console.log('File uploaded. Public URL:', publicUrl);

    // Process the image using the public URL
    const carData = await processImage(publicUrl);
    res.json(carData);
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    console.error('Error details:', error.message, error.stack);
    // More specific error messages
    let errorMessage = 'Error processing uploaded file';
    if (error.message.includes('bucket')) {
      errorMessage = 'Error accessing GCP bucket. Check permissions and bucket name.';
    } else if (error.message.includes('download')) {
      errorMessage = 'Error downloading image. Check the URL and network connectivity.';
    } 
    res.status(500).send(errorMessage);
  }
});

// Endpoint for URL-based recognition
app.post('/api/recognize', async (req, res) => {
  try {
    console.log('URL-based recognition request received.');
    const imageUrl = req.body.imageUrl;
    const carData = await processImage(imageUrl);
    res.json(carData);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
async function urlToGenerativePart(url) {
  try {
    console.log('Downloading image from URL:', url);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data, 'binary');
    const mimeType = response.headers['content-type'];
    return {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };
  } catch (error) {
    console.error('Error downloading or processing image:', error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error downloading image:', error.response.data);
      console.error('Status code:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.error('No response received from image URL:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up image download request:', error.message);
    }
    throw new Error('Failed to convert image URL to Part object'); 
  }
}

function fileToGenerativePart(path, mimeType) {
  try {
    const imageBuffer = fs.readFileSync(path);
    return {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };
  } catch (error) {
    console.error('Error reading image file:', error);
    throw new Error('Failed to convert image file to Part object');
  }
}

// Function to process the image (using either URL or uploaded file)
async function processImage(imageUrl) {
  const prompt = "This is the image of the car. Provide the following data about it: Model, Manufacturer, Year Engine, Horsepower, Transmission, Dimensions, Body Style";
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  let imagePart;
  try {
    if (imageUrl.startsWith('http')) {
      console.log('Processing image from URL:', imageUrl);
      imagePart = await urlToGenerativePart(imageUrl);
    } else {
      console.log('Processing image from local file path:', imageUrl);
      imagePart = fileToGenerativePart(imageUrl, 'image/jpeg'); 
    }

    console.log('imagePart:', imagePart); // Added console.log statement

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini API response received. Extracting car information...');
    return processGeminiResponse(text);
  } catch (error) {
    console.error('Error processing image:', error);
    // More specific error handling
    if (error.message.includes('Gemini API')) {
      // Handle Gemini API errors (e.g., check API key, permissions, request structure)
    } else if (error.message.includes('Part object')) {
      // Handle image conversion errors
    } 
    throw error; // Re-throw to be caught by the outer try-catch block
  }
}

function processGeminiResponse(text) {
  try {
    const modelRegex = /Model:\s*(.*)/i;
    const manufacturerRegex = /Manufacturer:\s*(.*)/i;
    const yearRegex = /Year:\s*(.*)/i;
    const engineRegex = /Engine:\s*(.*)/i;
    const horsepowerRegex = /Horsepower:\s*(\S+)/i;
    const transmissionRegex = /Transmission:\s*(.*)/i;
    const bodyStyleRegex = /Body Style:\s*(.*)/i;
    const dimensionsRegex = /Dimensions:\s*(.*)/i; 
    const model = text.match(modelRegex) ? text.match(modelRegex)[1] : "N/A";
    const manufacturer = text.match(manufacturerRegex) ? text.match(manufacturerRegex)[1] : "N/A";
    const year = text.match(yearRegex) ? text.match(yearRegex)[1] : "N/A";
    const engine = text.match(engineRegex) ? text.match(engineRegex)[1] : "N/A";
    const horsepower = text.match(horsepowerRegex) ? text.match(horsepowerRegex)[1] : "N/A";
    const transmission = text.match(transmissionRegex) ? text.match(transmissionRegex)[1] : "N/A";
    const bodyStyle = text.match(bodyStyleRegex) ? text.match(bodyStyleRegex)[1] : "N/A";
    const dimensions = text.match(dimensionsRegex) ? text.match(dimensionsRegex)[1] : "N/A"; 
    return {
      model,
      manufacturer,
      year,
      engine,
      horsepower,
      transmission,
      bodyStyle,
      dimensions, 
    };
  } catch (parsingError) {
    console.error('Error parsing Gemini response:', parsingError);
    throw new Error('Failed to parse car information'); 
  }
}

module.exports = app;
