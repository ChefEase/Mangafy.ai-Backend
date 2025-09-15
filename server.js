const { InferenceClient } = require("@huggingface/inference");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config({ path: "./.env.local" });
const fs = require('fs');

const app = express();
const PORT = 4000; // Choose any port that isn't in use

const path = require('path');
app.use(express.static(path.join(__dirname, '.next')));
app.use(express.static(path.join(__dirname, 'public')));
const hf = new InferenceClient(process.env.HF_API_KEY);

// Handle client-side routing
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://www.mangafyai.com/"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl or mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Not Allowed"));
    }
  },
  credentials: true
}));

app.use(express.json());

// Add this new endpoint to your server.js
app.post('/proxy/huggingface', async (req, res) => {
  try {
    const { model, inputs, parameters } = req.body;
    const HF_API_KEY = process.env.HF_API_KEY;

    if (!model || !inputs) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs, parameters },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 9000000 // 30 seconds timeout
      }
    );

    // Add CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    res.json(response.data);
  } catch (error) {
    console.error("Proxy Error Details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      request: {
        model: req.body.model,
        inputs: req.body.inputs?.substring(0, 100) + '...'
      }
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

app.post("/app/script-writing", async (req, res) => {
  try {
    const { outline, panelCount, panelType } = req.body;
    const HF_API_KEY = process.env.HF_API_KEY;
    console.log("HF API Key (Backend):", process.env.HF_API_KEY);
    console.log("Processing outline:", outline);
    
    if (typeof panelCount !== 'number' || panelCount < 1 || panelCount > 3) {
      return res.status(400).json({ error: "Invalid panelCount parameter" });
    }

    const validCounts = [1, 2, 3];
    const count = validCounts.includes(panelCount) ? panelCount : 3;

    const cleanOutline = outline
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/\n/g, ' ')       // Remove newlines
      .trim();

      if (!outline || typeof outline !== 'string') {
        throw new Error("Invalid outline format - must be a string");
      }
        // Add this debug log
      console.log("Raw outline input:", outline.substring(0, 100) + '...');
      console.log("Requested panel count:", panelCount); 

if (![1, 2, 3].includes(panelCount)) {
  console.warn(`Invalid panelCount (${panelCount}), defaulting to 3`);
  panelCount = 3;
}

      const panelExamples = {
        1: `[EXAMPLE]
  Panel 1
  Scene: A detailed description of setting and action of the story outline
  Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
  Dialogue: "Conversation in the story"`,
        2: `[EXAMPLE]
  Panel 1
  Scene: A detailed description of the setting and action of the first scene
  Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
  Dialogue: "First conversation in the story"
  
  Panel 2
  Scene: A deatiled Description of the setting and action of the second scene
  Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
  Dialogue: "last conversation in the story"`,
        3: `[EXAMPLE]
  Panel 1
  Scene: A detailed description of the setting and action of the opening scene
  Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
  Dialogue: "Opening conversation of the story"
  
  Panel 2
  Scene: A detailed description of the setting and action of the middle scence
  Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
  Dialogue: "Middle conversation of the story"
  
  Panel 3
  Scene: A detailed description of the seeting and action of the closing scene
  Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
  Dialogue: "Last conversation of the story"`
      };
  
// server.js - Update the prompt
const prompt = `Generate ${panelCount} manga panel(s) STRICTLY in this format AND YOU MUST FOLLOW THE RULES DOWN BELOW:

${panelExamples[panelCount]}

!!! IMPORTANT RULES THAT YOU MUST FOLLOW !!!
You are a manga scene director. You will ONLY use the characters, setting, and action I provide. 
DO NOT add unnecessary characters, elements, scenes or backgrounds unless specified!! Stick to the script. Stick to what i say!!
You are NOT allowed to create new narrative elements. Only describe what is written above. Be visual, not imaginative. 
YOU MUST CONSISTENTLY USE THE FORMAT IN ${panelExamples}. IT IS A MUST!!!
YOU MUST Generate exactly ${panelCount} panels. Do not genertae less than ${panelCount} and DO NOT GENERATE MORE than ${panelCount}!!
When asked to generate 1 manga panel, you MUST GENERATE ONLY 1 Manga Panel and not FIVE!!
YOU MUST , it is a must to Follow the format in ${panelExamples} EXACTLY as provided
It is a must that the scene must include a detailed description of the setting and action not just a description of the setting.
CHARACTERS MENTIONED MUST APPEAR IN THE PANELS.
Every panel generated, every panel generated MUST use the same format. Don't use [1] for Panel 1. use panel 1 for Panel 1, Panel 2 for Panel 2 and Panel 3 for Panel 3. Do not stry away from the format under any circumstance.
YOU MUST COMPLETELY GENERATE ALL THE PANLES. EVERY SINGLE PANEL MUST BE FULLY GENERATED IN THE RIGHT FORMAT. EVERY SINGLE PANEL MUST BE FULLY GENERATED WITH THE SCENE, CAMERA AND DIALOGUE!!.
IF Characters are mentioned in story, u MUST include them in the story and visually describe what they are wearing or what they are doing, if mentioned in the story, if not, do not include them.
2. Number panels sequentially from Panel 1
3. You MUST use the camera angle like e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
6. You MUST generate conversations of the sory
7. ALWAYS include a Scene, Camera, and Dialogue for each panel
8. Do not skip any sections
9. Do not add any extra text, recommendations, or explanations
10. Do not include symbols like ❤️ or other non-text characters


Outline: ${cleanOutline}`;

const response = await hf.chatCompletion({
  model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
  messages: [
      { role: "user", content: prompt }
  ],
  parameters: {
      max_new_tokens: 1000,
      temperature: 0.3
  }
});
const choice = response?.choices?.[0];
const generatedTextRaw = 
  (choice?.message?.content && typeof choice.message.content === 'string') ? choice.message.content :
  (choice?.text && typeof choice.text === 'string') ? choice.text :
  (response?.generated_text && typeof response.generated_text === 'string') ? response.generated_text :
  null;

const generatedText = generatedTextRaw?.trim();
console.log("Raw response text:", generatedTextRaw);
console.log("Cleaned text after trim:", generatedTextRaw?.trim());
console.log("Length:", generatedTextRaw?.trim()?.length);
console.log("Raw HF response object:", JSON.stringify(response, null, 2));

if (!generatedText || generatedText.length < 10) {
  console.error("Generated text is too short or missing.");
  throw new Error("No valid text generated from AI");
}

const cleanText = generatedText
    .replace(/\[([0-9]+)\]/g, 'Panel $1') // ✅ convert [1] to Panel 1
    .replace(/:\s*\n/g, '\n')            // ✅ normalize "Panel 1:\n" to "Panel 1\n"
    .replace(/```/g, '')                 // remove markdown blocks
    .replace(/\*\*/g, '')                // remove bold
    .replace(/[^\x00-\x7F]/g, '')        // remove emojis
  .replace(/```/g, '')  // Remove markdown code blocks
  .replace(/\*\*/g, '')  // Remove bold markers
  .replace(/\d+\.\s*\d+\./g, '') // Remove duplicate numbering (e.g., 6. 6.)
  .replace(/.*PANEL 1:/s, 'PANEL 1:') // Remove everything before the first panel
  .replace(/\[Panel/g, 'PANEL')
  .replace(/\]/g, '') 
  .replace(/Panel \d+:/g, match => match.replace(':', '')) // Remove colons
  .replace(/Thought bubble from |Narration box:/g, '') // Remove dialogue prefixes
  .trim();
  console.log("Cleaned AI Response:", cleanText);

    console.log("Raw AI Response:", generatedText);
    const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
fs.writeFileSync(path.join(logDir, 'last_response.txt'), generatedText);
      // In server.js
      let panelRegex = /Panel\s*\d+\s*\n\s*Scene:\s*(.+?)\s*\n\s*Camera:\s*(.+?)\s*\n\s*Dialogue:\s*(.+?)(?=\n\s*Panel|\s*$)/gis;
       let matches = [...cleanText.matchAll(panelRegex)];
       console.log(`Panels detected: ${matches.length}, Expected: ${panelCount}`);

    console.log("Regex Matches:", matches);
    if (matches.length === 0) {
      console.log("Trying alternative parsing..."); 
      panelRegex = /Scene\s*:\s*((?:.|\n)+?)\s*\n\s*Camera\s*:\s*((?:.|\n)+?)\s*\n\s*Dialogue\s*:\s*"?(.+?)"?/gis;
      matches = [...generatedText.matchAll(panelRegex)].map(m => ({
        0: m[0],
        1: m[1],  // Scene
        2: m[2],  // Camera
        3: m[3]   // Dialogue
      }));
    }
    
if (matches.length !== panelCount) {
  console.warn(`Mismatch detected. Expected ${panelCount}, but received ${matches.length}`);
  matches = matches.slice(0, panelCount);  // Trim excess panels
}
    
if (matches.length === 0) {
  matches = [...cleanText.matchAll(panelRegex)];
}

if (matches.length === 0) {
  console.error("Failed to parse panels from:", generatedText);
  throw new Error(`No valid panels parsed. Raw AI output: ${generatedText.substring(0, 200)}...`);
}
    const panels = matches.map(match => {
      scene =  match[1]?.trim(),
      camera =  match[2]?.trim(),
      dialogue =  match[3]?.trim()

      if (!scene || !camera || !dialogue) {
        throw new Error(`Panel is missing required sections. Scene: ${scene}, Camera: ${camera}, Dialogue: ${dialogue}`);
      }

    return {
      scene,
      camera,
      dialogue
    };
    });

    if (
      !response ||
      !response.choices ||
      !response.choices[0]?.message?.content
    ) {
      throw new Error("No text generated from AI");
    }

    console.log("Response from Hugging Face:", response.data);
    if (!scene || !camera || !dialogue) {
      throw new Error(`Panel is missing required sections. Scene: ${scene}, Camera: ${camera}, Dialogue: ${dialogue}`);
    }

    if (panels.length === 0) throw new Error("No valid panels parsed");
    if (panels.length !== count) {
      throw new Error(`Requested ${count} panels but received ${panels.length}`);
    }

    if (Math.abs(panels.length - count) > 1) {
      throw new Error(`Panel count mismatch. Requested ${count}, got ${panels.length}`);
    }


    res.json({ panels });
  } catch (error) {
    console.error("Full Error Context:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: error.message,
      ...(error.response && { details: error.response.data })
    });
  }
});

// Add this before app.listen in server.js
async function warmupModel() {
  try {
    await axios.post(
      "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
      { inputs: "Warmup request" },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000
      }
    );
    console.log("Model warmup successful");
  } catch (error) {
    console.log("Model warmup completed (ignore any errors)");
  }
}

// Run warmup on server start
warmupModel();
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '.next/server/pages/index.html'));
})
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});/Panel\s*\d+\s*:\s*\n\s*Scene\s*:\s*(.+?)\s*\n\s*Camera\s*:\s*(.+?)\s*\n\s*Dialogue\s*:\s*"?(.+?)"?\s*(?=\n\s*Panel|$)/gis