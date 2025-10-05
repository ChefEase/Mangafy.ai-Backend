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
  "https://www.mangafyai.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow server-to-server or tools (no origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn("CORS rejected origin:", origin);
    return callback(new Error("CORS Not Allowed"));
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

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
      requestSnippet: {
        model: req.body.model,
        inputsPreview: typeof req.body.inputs === 'string' ? req.body.inputs.substring(0,100) + '...' : '[object]'
      }
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

app.post("/app/script-writing", async (req, res) => {
  try {
    // allow reassignment if we need to normalize panelCount
    let { outline, panelCount, panelType } = req.body;

    // Basic validation
    if (!outline || typeof outline !== "string") {
      return res.status(400).json({ error: "Invalid outline format - must be a non-empty string" });
    }

    if (typeof panelCount !== "number" || panelCount < 1 || panelCount > 3) {
      return res.status(400).json({ error: "Invalid panelCount parameter (must be 1, 2 or 3)" });
    }

    // Normalize values
    const validCounts = [1, 2, 3];
    const count = validCounts.includes(panelCount) ? panelCount : 3;

    const cleanOutline = outline.replace(/<[^>]*>?/gm, "").replace(/\n/g, " ").trim();

    // Panel examples (kept from your original)
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
Scene: A detailed description of the setting and action of the second scene
Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
Dialogue: "Last conversation in the story"`,
      3: `[EXAMPLE]
Panel 1
Scene: A detailed description of the setting and action of the opening scene
Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
Dialogue: "Opening conversation of the story"

Panel 2
Scene: A detailed description of the setting and action of the middle scene
Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
Dialogue: "Middle conversation of the story"

Panel 3
Scene: A detailed description of the setting and action of the closing scene
Camera: Shot type e.g close-up, medium, wide, low, extreme-close up, back, bird's eye, high
Dialogue: "Last conversation of the story"`
    };

    // Build the prompt (kept your rules)
    const prompt = `Generate ${count} manga panel(s) STRICTLY in this format AND YOU MUST FOLLOW THE RULES DOWN BELOW:

${panelExamples[count]}

!!! IMPORTANT RULES THAT YOU MUST FOLLOW !!!
You are a manga scene director. You will ONLY use the characters, setting, and action I provide. 
DO NOT add unnecessary characters, elements, scenes or backgrounds unless specified!! Stick to the script. Stick to what i say!!
You are NOT allowed to create new narrative elements. Only describe what is written above. Be visual, not imaginative. 
YOU MUST CONSISTENTLY USE THE FORMAT IN ${panelExamples[count]}. IT IS A MUST!!!
YOU MUST Generate exactly ${count} panels. Do not generate less than ${count} and DO NOT GENERATE MORE than ${count}!!
When asked to generate 1 manga panel, you MUST GENERATE ONLY 1 Manga Panel and not FIVE!!
YOU MUST follow the format in ${panelExamples[count]} EXACTLY as provided
It is a must that the scene includes a detailed description of the setting and action not just a description of the setting.
CHARACTERS MENTIONED MUST APPEAR IN THE PANELS.
Every panel generated MUST use the same format. Use Panel 1, Panel 2, Panel 3 exactly.
YOU MUST COMPLETELY GENERATE ALL THE PANELS. EVERY SINGLE PANEL MUST BE FULLY GENERATED IN THE RIGHT FORMAT.
IF characters are mentioned in story, you MUST include them in the panels and describe what they are wearing or doing if specified.
2. Number panels sequentially from Panel 1
3. You MUST use the camera angle like e.g. close-up, medium, wide, low, extreme-close up, back, bird's eye, high
6. You MUST generate conversations of the story
7. ALWAYS include a Scene, Camera, and Dialogue for each panel
8. Do not skip any sections
9. Do not add any extra text, recommendations, or explanations
10. Do not include non-text symbols like emojis

Outline: ${cleanOutline}`;

    // Call the HF chat model
    const response = await hf.chatCompletion({
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      messages: [{ role: "user", content: prompt }],
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.3
      }
    });

    // Extract generated text safely (support multiple response shapes)
    const choice = response?.choices?.[0];
    const generatedTextRaw =
      (choice?.message?.content && typeof choice.message.content === "string")
        ? choice.message.content
        : (choice?.text && typeof choice.text === "string")
        ? choice.text
        : (response?.generated_text && typeof response.generated_text === "string")
        ? response.generated_text
        : null;

    if (!generatedTextRaw || generatedTextRaw.trim().length < 10) {
      console.error("Generated text is missing or too short", { generatedTextRaw, responseSummary: response ? true : false });
      throw new Error("No valid text generated from AI");
    }

    const generatedText = generatedTextRaw.trim();

    // Save raw output for debugging (non-blocking)
    try {
      const logDir = path.join(__dirname, "logs");
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
      fs.writeFileSync(path.join(logDir, "last_response.txt"), generatedText, "utf8");
    } catch (e) {
      console.warn("Failed to write log file:", e.message);
    }

    // Clean the text (remove markdown, emoji, etc.)
    const cleanText = generatedText
      .replace(/\[([0-9]+)\]/g, "Panel $1")
      .replace(/:\s*\n/g, "\n")
      .replace(/```/g, "")
      .replace(/\*\*/g, "")
      .replace(/[^\x00-\x7F]/g, "") // strip non-ascii (emojis)
      .trim();

    // Primary regex: Panel N \n Scene: ... \n Camera: ... \n Dialogue: ...
    let panelRegex = /Panel\s*\d+\s*\n\s*Scene:\s*(.+?)\s*\n\s*Camera:\s*(.+?)\s*\n\s*Dialogue:\s*(.+?)(?=\n\s*Panel|\s*$)/gis;
    let matches = [...cleanText.matchAll(panelRegex)];

    // If primary parsing fails, try a looser pattern on the original generated text
    if (matches.length === 0) {
      panelRegex = /Scene\s*:\s*((?:.|\n)+?)\s*\n\s*Camera\s*:\s*((?:.|\n)+?)\s*\n\s*Dialogue\s*:\s*"?(.+?)"?/gis;
      matches = [...generatedText.matchAll(panelRegex)];
    }

    // If still empty, try another normalization attempt (e.g., uppercase PANEL)
    if (matches.length === 0) {
      const upper = generatedText.replace(/\[Panel/gi, "PANEL").replace(/\[panel/gi, "PANEL");
      panelRegex = /PANEL\s*\d+\s*[:\s]*\n\s*Scene:\s*(.+?)\s*\n\s*Camera:\s*(.+?)\s*\n\s*Dialogue:\s*(.+?)(?=\n\s*PANEL|\s*$)/gis;
      matches = [...upper.matchAll(panelRegex)];
    }

    // Warn on mismatch, slice to requested count
    if (matches.length !== count) {
      console.warn(`Panel count mismatch: requested ${count}, parsed ${matches.length}`);
    }
    matches = matches.slice(0, count);

    if (matches.length === 0) {
      console.error("Failed to parse any panels from AI output:", generatedText.substring(0, 400));
      throw new Error("No valid panels parsed from AI output");
    }

    // Build panels array safely
    const panels = matches.map((m, idx) => {
      // m may be an array match or an object with numeric indices
      const sceneRaw = m[1] ?? m[1];
      const cameraRaw = m[2] ?? m[2];
      const dialogueRaw = m[3] ?? m[3];

      const scene = (sceneRaw || "").toString().trim();
      const camera = (cameraRaw || "").toString().trim();
      const dialogue = (dialogueRaw || "").toString().trim();

      if (!scene || !camera || !dialogue) {
        throw new Error(`Parsed panel ${idx + 1} is missing required fields. scene:${!!scene} camera:${!!camera} dialogue:${!!dialogue}`);
      }

      return { scene, camera, dialogue };
    });

    // Final checks
    if (panels.length === 0) {
      throw new Error("No valid panels produced after parsing.");
    }

    // Optionally enforce exact count
    if (panels.length !== count) {
      console.warn(`Returning ${panels.length} panels but requested ${count}.`);
    }

    return res.json({ panels });
  } catch (error) {
    // Ensure we surface useful debugging info without leaking secrets
    console.error("Full Error Context (script-writing):", {
      message: error?.message,
      stack: error?.stack,
      responseData: error?.response?.data
    });

    return res.status(500).json({
      error: error?.message || "Unknown server error",
      ...(error?.response && { details: error.response.data })
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