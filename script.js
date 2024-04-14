// Import the Gemini API client
const { GeminiAPI } = require('gemini-api');

// Initialize the API client with your API key
const gemini = new GeminiAPI('AIzaSyC7Wl6DM8VOAR7_NrxXLsaxLSeT4u2QYKM');

// Define the URL of the image you want to analyze
const imageUrl = 'https://drive.google.com/file/d/1vZ718wNBlNKMjGOgH4aNEpT4Sx-70YWs/view?usp=sharing';

// Define the endpoint for the Gemini API
const endpoint = 'https://api.gemini.ai/v1/analyze';

// Define the data you want to send to the Gemini API
const data = {
  image_url: imageUrl,
  features: [
    'msrp',
    'mpg',
    'engine',
    'horsepower',
    'transmission',
    'dimensions',
    'body_styles'
  ]
};

// Send a POST request to the Gemini API with the data
gemini.post(endpoint, data)
  .then(response => {
    // Log the response from the Gemini API
    console.log(response.data);
  })
  .catch(error => {
    // Log any errors that occur
    console.error(error);
  });
