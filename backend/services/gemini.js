/**
 * Gemini Flash Wrapper
 *
 * Model: gemini-1.5-flash
 * Temperature: 0.3 (low = faster, more consistent JSON)
 * Max tokens: ~300 (keeps responses tight)
 *
 * Always returns JSON only from the model.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

let genai = null;
let model = null;

function initGemini() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in environment variables.");
    return;
  }
  genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });

  console.log("API KEY:", process.env.GEMINI_API_KEY);
}

async function testModels() {
  try {
    const models = await genai.listModels();
    console.log("Available models:", models);
  } catch (err) {
    console.error("ListModels Error:", err.message);
  }
}

async function callGemini(prompt, maxTokens = 300) {
  if (!model) {
    initGemini();
    testModels();
  }
  if (!model) {
    throw new Error("Gemini model not initialized. Check GEMINI_API_KEY.");
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
    },
  });

  return result.response.text();
}

/**
 * Parse a JSON response from Gemini.
 * Gemini sometimes wraps JSON in markdown fences or adds preamble text.
 * This strips all of that and extracts the JSON object.
 */
function parseGeminiJSON(raw) {
  // Strip markdown fences
  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Find the JSON block (Gemini sometimes adds text before/after)
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON object found in Gemini response");
  }

  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
}

module.exports = { callGemini, parseGeminiJSON, initGemini };
