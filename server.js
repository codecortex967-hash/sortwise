import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const CATEGORY_MAP = {
  plastic: ['plastic', 'plastic bottle', 'wrapper', 'plastic bag', 'container', 'polyethylene'],
  metal: ['metal', 'tin can', 'aluminum can', 'metal lid', 'can', 'foil', 'steel', 'tin'],
  paper: ['paper', 'newspaper', 'cardboard', 'paper cup', 'carton', 'box', 'magazine'],
  glass: ['glass', 'glass bottle', 'jar'],
  organic: ['organic', 'banana peel', 'food waste', 'vegetables', 'leaves', 'food', 'peels', 'fruit', 'apple', 'scrap','rubber']
};

function mapToFixedCategory(rawOutput) {
  const normalized = rawOutput.toLowerCase().trim();
  
  if (Object.keys(CATEGORY_MAP).includes(normalized)) {
    return normalized;
  }

  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return category;
    }
  }

  return 'organic'; // fallback
}

app.post('/classify', async (req, res) => {
  try {
    const { base64Image } = req.body;
    
    // 6. ADD DEBUG LOGGING: Whether image received
    console.log(`[DEBUG] Received /classify request. Image present: ${!!base64Image}`);
    
    // 3. VALIDATE INPUT
    if (!base64Image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Strip prefix if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");

    // 8. DO NOT HARD-CODE API KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing from environment variables");
      return res.status(500).json({ error: "Server configuration error: Missing API key" });
    }

    // 1. FIX API URL
    const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const url = `${baseUrl}?key=${apiKey}`;

    // 6. ADD DEBUG LOGGING: API URL (without key)
    console.log(`[DEBUG] Calling Gemini API at: ${baseUrl}`);

    // 2. FIX REQUEST PAYLOAD
    const payload = {
      contents: [{
        parts: [
          { text: "Classify this waste item into exactly one of these five categories: plastic, metal, paper, glass, organic. Return ONLY ONE WORD from this list and nothing else. No punctuation, no explanation." },
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "image/jpeg"
            }
          }
        ]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    // 4. IMPROVE ERROR HANDLING
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error - Status: ${response.status} ${response.statusText}`);
      console.error("Gemini Response Body:", errorText);
      return res.status(response.status).json({ 
        error: "External API error from Gemini", 
        details: errorText 
      });
    }

    const data = await response.json();

    // 6. ADD DEBUG LOGGING: Gemini response body
    console.log("[DEBUG] Gemini Response Body:", JSON.stringify(data, null, 2));

    // 5. SAFE RESPONSE PARSING
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts;
    const rawText = parts?.[0]?.text;

    if (!rawText) {
      console.error("Failed to parse Gemini response payload:", JSON.stringify(data, null, 2));
      return res.status(502).json({ error: "Invalid response format from Gemini API" });
    }

    // 6. ADD DEBUG LOGGING: Extracted classification text
    console.log(`[DEBUG] Extracted raw text from Gemini: "${rawText}"`);

    const label = mapToFixedCategory(rawText);
    console.log(`[DEBUG] Mapped label: "${label}"`);
    
    // Return clean label
    res.json({ label });

  } catch (error) {
    console.error("Exception in /classify:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
