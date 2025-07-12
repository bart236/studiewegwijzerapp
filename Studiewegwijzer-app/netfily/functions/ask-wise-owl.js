// This is a Netlify serverless function. It acts as a secure bridge
// between your frontend app and the Google Gemini API.

// The 'fetch' function is not available by default in this Node.js environment,
// so we need to import it.
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Get the secret API key from the environment variables you set up in Netlify.
  // This key is never exposed to the user's browser.
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return { statusCode: 500, body: 'API key not found.' };
  }

  try {
    // Get the chat history sent from the frontend app.
    const { chatHistory } = JSON.parse(event.body);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: chatHistory,
    };

    // Call the Google Gemini API from the server.
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error:', errorBody);
        return { statusCode: response.status, body: `API Error: ${response.statusText}` };
    }

    const data = await response.json();

    // Send the response from Gemini back to the frontend app.
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error in serverless function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

