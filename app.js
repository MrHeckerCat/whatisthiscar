const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

// Replace with your actual Gemini API key 
const GEMINI_API_KEY = '';

const app = express();
app.use(bodyParser.json());

app.post('/api/recognize', async (req, res) => {
  try {
    const imageUrl = req.body.imageUrl;
    const prompt = "This is the image of the car. Provide the following data about it: Model, Manufacturer, Year Engine, Horsepower, Transmission, Dimensions, Body Style";

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Download and convert the image from the URL
    const imagePart = await urlToGenerativePart(imageUrl);

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const carData = processGeminiResponse(text);
    res.json(carData);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

async function urlToGenerativePart(url) {
  try {
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
    throw new Error('Failed to convert image URL to Part object');
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
    const dimensionsRegex = /Dimensions:\s*(.*)/i; // Added regex for dimensions

    const model = text.match(modelRegex) ? text.match(modelRegex)[1] : "N/A";
    const manufacturer = text.match(manufacturerRegex) ? text.match(manufacturerRegex)[1] : "N/A";
    const year = text.match(yearRegex) ? text.match(yearRegex)[1] : "N/A";
    const engine = text.match(engineRegex) ? text.match(engineRegex)[1] : "N/A";
    const horsepower = text.match(horsepowerRegex) ? text.match(horsepowerRegex)[1] : "N/A";
    const transmission = text.match(transmissionRegex) ? text.match(transmissionRegex)[1] : "N/A";
    const bodyStyle = text.match(bodyStyleRegex) ? text.match(bodyStyleRegex)[1] : "N/A";
    const dimensions = text.match(dimensionsRegex) ? text.match(dimensionsRegex)[1] : "N/A"; // Extracting dimensions

    return {
      model,
      manufacturer,
      year,
      engine,
      horsepower,
      transmission,
      bodyStyle,
      dimensions, // Added to the returned object
    };
  } catch (parsingError) {
    console.error('Error parsing Gemini response:', parsingError);
    throw new Error('Failed to parse car information'); 
  }
}

module.exports = app;
