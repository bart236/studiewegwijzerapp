// Dit is de code voor de Netlify Function die als veilige tussenpersoon fungeert.
// Bestandsnaam: gemini-proxy.js

// Importeren van de 'node-fetch' bibliotheek om API-aanroepen te kunnen doen vanuit de functie.
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  console.log("Netlify function 'gemini-proxy' started.");

  // De API-sleutel wordt veilig opgehaald uit de Netlify omgevingsvariabelen.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in Netlify environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'API sleutel is niet geconfigureerd op de server.' }),
    };
  }
  console.log("API Key found.");

  const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const requestBody = JSON.parse(event.body);
    console.log("Request body parsed successfully.");
    const { history, prompt, image, fileContent, structured } = requestBody;

    const userParts = [];
    if (prompt || fileContent) {
        let fullPrompt = prompt || '';
        if (fileContent) {
            fullPrompt += `\n\n--- INHOUD VAN BESTAND ---\n${fileContent}`;
        }
        userParts.push({ text: fullPrompt });
    }
    if (image) {
        userParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: image.split(',')[1]
            }
        });
    }

    const contents = [...history, { role: "user", parts: userParts }];
    const payload = { contents };

    if (structured) {
        payload.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    vragen: { type: 'STRING' },
                    antwoorden: { type: 'STRING' }
                },
                required: ['vragen', 'antwoorden']
            }
        };
        console.log("Structured JSON payload created for Test-Trainer.");
    } else {
        console.log("Standard payload created.");
    }

    console.log("Sending request to Google API...");
    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`Google API response status: ${response.status}`);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Google API Error:', JSON.stringify(errorBody, null, 2));
      return {
        statusCode: response.status,
        body: JSON.stringify({ message: errorBody.error.message || 'Fout bij de Google API.' }),
      };
    }

    const data = await response.json();
    console.log("Successfully received data from Google API.");
    
    return {
      statusCode: 200,
      body: JSON.stringify({ text: data.candidates[0]?.content?.parts[0]?.text }),
    };

  } catch (error) {
    console.error('Proxy Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Interne serverfout in de proxy-functie.', details: error.message }),
    };
  }
};
