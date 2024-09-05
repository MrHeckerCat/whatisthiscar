const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const Multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

// Replace with your actual Gemini API key and GCP project ID
const GEMINI_API_KEY = 'AIzaSyC7Wl6DM8VOAR7_NrxXLsaxLSeT4u2QYKM';
const GCP_PROJECT_ID = 'theta-maker-418212';

// Multer configuration
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GCP Storage client
const storage = new Storage({ projectId: GCP_PROJECT_ID });
const bucketName = 'whatisthiscartest';
const bucket = storage.bucket(bucketName);

const app = express();
app.use(bodyParser.json());

// Global variable to store uploaded image URL
let uploadedImageUrl = undefined;

// Endpoint for file upload
app.post('/api/upload', multer.single('image'), async (req, res) => {
  try {
    console.log('File upload request received.');
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    // File type validation (example for JPEG images)
    if (!req.file.mimetype.startsWith('image')) {
      return res.status(400).send('Invalid file type. Only image files are allowed.');
    }

    // Upload file to GCP bucket
    console.log('Uploading file to GCP bucket...');
    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream();
    blobStream.end(req.file.buffer);

    // Get public URL of the uploaded file
    uploadedImageUrl = `https://storage.googleapis.com/${bucketName}/${req.file.originalname}`;
    console.log('File uploaded. Public URL:', uploadedImageUrl);

    res.json({ imageUrl: uploadedImageUrl });
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).send('Error processing uploaded file.');
  }
});

// Endpoint for URL-based recognition
app.post('/api/recognize', async (req, res) => {
  try {
    console.log('Recognition request received.');

    // Use uploadedImageUrl if available, otherwise use provided URL
    const imageUrl = uploadedImageUrl || req.body.imageUrl;

    // Ensure an image URL is available
    if (!imageUrl) {
      return res.status(400).send('No image URL provided. Please upload an image or enter a URL.');
    }

    const carData = await processImage(imageUrl, res); // Pass res here
    res.json(carData);

    // Reset uploadedImageUrl after processing
    uploadedImageUrl = undefined;

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ message: 'Failed to process image.' }); // Send a more generic error
  }
});

async function urlToGenerativePart(url) {
  try {
    console.log('Downloading image from URL:', url);
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    // Error handling for unsuccessful download
    if (!response.data) {
      throw new Error('Failed to download image from URL.');
    }

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
    // Explicitly throw a new error to handle in the processImage function
    throw new Error('Failed to convert image URL to Part object'); 
  }
}

// Function to process the image (using either URL or uploaded file)
async function processImage(imageUrl, res) { 
  const prompt = "This is the image of the car. Provide the following data about it: Model, Manufacturer, Year Engine, Horsepower, Transmission, Dimensions, Body Style";
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using gemini-1.5-flash

  try {
    console.log('Processing image from URL:', imageUrl);
    const imagePart = await urlToGenerativePart(imageUrl);

    console.log('Sending request to Gemini API...');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = await response.text();
    console.log('Gemini API response received. Extracting car information...');
    return processGeminiResponse(text, res); // Pass res here
  } catch (error) {
    console.error('Error processing image:', error);
    // Handle errors that occur during the image processing (including errors from urlToGenerativePart)
    return res.status(500).json({ message: 'Failed to process image.' }); // Return error response
  }
}

// Function to parse the Gemini response and extract car information
function processGeminiResponse(text, res) { 
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
    // Handle errors that occur during parsing 
    return res.status(500).json({ message: 'Failed to parse car information.' }); // Return error response
  }
}

module.exports = app;
