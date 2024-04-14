const { GoogleGenerativeAI } = require("@google/generative-ai");

const axios = require("axios");

const { Buffer } = require("buffer");


const API_KEY = "AIzaSyC7Wl6DM8VOAR7_NrxXLsaxLSeT4u2QYKM";


const genAI = new GoogleGenerativeAI(API_KEY);


async function run() {

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const imageUrl = "";


  try {

    const response = await axios.get(imageUrl, {

      responseType: "arraybuffer",

    });


    const imageData = Buffer.from(response.data, "binary").toString("base64");

    const imageText = `This is an image of a car. Here is the base64-encoded image data: data:image/jpeg;base64,${imageData}`;


    const chat = model.startChat({

      history: [

        {

          role: "user",

          parts: [{ text: imageText }],

        },

        {

          role: "model",

          parts: [{ text: "Great to meet you. What would you like to know?" }],

        },

      ],

      generationConfig: {

        maxOutputTokens: 200,

      },

    });


    const msg = "What is the MSRP, MPG, engine, horsepower, transmission, dimensions, and body styles of this car?";


    const result = await chat.sendMessage(msg);

    const responseFromChat = await result.waitForResponse();

    const text = responseFromChat.parts[0].text;

    console.log(text);

  } catch (error) {

    console.error("An error occurred:", error);

  }

}


run();
