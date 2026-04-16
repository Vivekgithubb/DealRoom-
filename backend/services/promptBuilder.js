/**
 * Prompt Builder
 * 
 * Builds structured prompts for each of the 4 agents.
 * All prompts instruct Gemini to return JSON only.
 * 
 * Agent 1: Strategist (setup)
 * Agent 2: Whisperer (real-time, per "Them" turn)
 * Agent 3: Closer (report)
 * Agent 4: Simulator (outcome paths)
 */

/**
 * Format transcript turns for prompt injection.
 * Each turn becomes "User: text" or "Other party: text"
 */
function formatTurns(turns) {
  return turns
    .map((t) => `${t.speaker === "me" ? "User" : "Other party"}: ${t.text}`)
    .join("\n");
}

/**
 * Agent 1 — Strategist
 * Runs once at session start. Builds the playbook.
 */
function buildSetupPrompt({ deal_type, goal, walkaway, counterparty_context }) {
  return `You are a negotiation strategist. Analyze this deal and create a concise playbook.

Deal type: ${deal_type}
User's goal: ${goal}
Walkaway point: ${walkaway}
Counterparty context: ${counterparty_context || "No specific context provided."}

Return ONLY a JSON object with this exact structure:
{
  "playbook_summary": "A 150-200 word strategic summary covering opening position, key leverage points, tactics to use, and what to avoid.",
  "opening_move": "One sentence describing the ideal first offer or opening statement.",
  "key_leverage": ["leverage point 1", "leverage point 2", "leverage point 3"],
  "red_lines": ["thing to never concede 1", "thing to never concede 2"]
}

Return only JSON. No preamble. No markdown fences.`;
}

/**
 * Agent 2 — Whisperer
 * Runs per "Them" turn. This is the core real-time loop.
 * Single Gemini call returns suggestion, tactic, confidence, power_delta, red_flag, and reasoning.
 */
function buildWhisperPrompt(context) {
  const turnsFormatted = formatTurns(context.turns);
  const latestTurn = context.turns.length > 0
    ? context.turns[context.turns.length - 1].text
    : "";

  return `You are a real-time negotiation coach. The user is in an active negotiation.

Context:
- Deal type: ${context.deal_type}
- User's goal: ${context.goal}
- Walkaway point: ${context.walkaway}
- Strategy: ${context.playbook_summary}

Recent conversation (most recent last):
${turnsFormatted}

The other party just said: "${latestTurn}"

Analyze what they said and provide guidance. Return ONLY a JSON object:
{
  "suggestion": "Specific action or line for the user to say next. Max 15 words.",
  "tactic": "One of: anchoring | urgency_pressure | social_proof | hard_close | lowball | good_cop_bad_cop | silence_pressure | flinch | unknown | null",
  "confidence": 0.87,
  "power_delta": -2,
  "red_flag": false,
  "reasoning": "One sentence explaining why this suggestion."
}

power_delta rules: positive = user gained power, negative = other party gained power. Range: -5 to +5.
red_flag: set to true only if they used urgency, hard close, or aggressive pressure tactics.

Return only JSON. No preamble. No markdown fences.`;
}

/**
 * Agent 3 — Closer
 * Runs once when session ends. Generates the full report.
 */
function buildReportPrompt({ deal_type, goal, walkaway, playbook_summary, transcript, whispers }) {
  const fullTranscript = formatTurns(transcript);

  // Build tactics summary from whisper history
  const tacticsUsed = whispers
    .filter((w) => w.tactic && w.tactic !== "unknown")
    .map((w) => w.tactic);
  const tacticsSummary = tacticsUsed.length > 0
    ? [...new Set(tacticsUsed)].join(", ")
    : "No specific tactics detected.";

  return `You are a negotiation analyst. Analyze this completed negotiation session.

Deal context:
- Type: ${deal_type}
- Goal: ${goal}
- Walkaway: ${walkaway}
- Strategy going in: ${playbook_summary}

Full transcript:
${fullTranscript}

Detected tactics during session: ${tacticsSummary}

Return ONLY a JSON object:
{
  "summary": "3-5 sentence overall assessment of how the negotiation went.",
  "wins": ["moment 1 where user had advantage", "moment 2"],
  "losses": ["moment where they unnecessarily conceded", "moment 2"],
  "missed_opportunities": ["thing they could have pushed on", "moment 2"],
  "follow_up_email": "A complete, professional follow-up email based on the outcome.",
  "negotiation_style": "2 sentences describing the user's observed negotiation style and one concrete improvement."
}

Return only JSON. No preamble. No markdown fences.`;
}

/**
 * Agent 4 — Simulator
 * Runs on demand. Simulates three negotiation paths.
 */
function buildSimulatePrompt({ deal_type, goal, walkaway, playbook_summary }) {
  return `You are a negotiation outcome predictor. Given this deal context, simulate three negotiation paths.

Deal type: ${deal_type}
Goal: ${goal}
Walkaway: ${walkaway}
Playbook: ${playbook_summary || "No playbook generated yet."}

Return ONLY a JSON object:
{
  "paths": [
    {
      "strategy": "conservative",
      "label": "Play it safe",
      "description": "2 sentences on this approach.",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 72,
      "risk_level": "low",
      "tradeoff": "What you give up with this approach."
    },
    {
      "strategy": "balanced",
      "label": "Balanced push",
      "description": "2 sentences on this approach.",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 58,
      "risk_level": "medium",
      "tradeoff": "What you give up with this approach."
    },
    {
      "strategy": "aggressive",
      "label": "High-risk high-reward",
      "description": "2 sentences on this approach.",
      "expected_outcome": "Specific predicted outcome.",
      "probability_of_success": 31,
      "risk_level": "high",
      "tradeoff": "What you give up with this approach."
    }
  ]
}

Return only JSON. No preamble. No markdown fences.`;
}

module.exports = {
  buildSetupPrompt,
  buildWhisperPrompt,
  buildReportPrompt,
  buildSimulatePrompt,
  formatTurns,
};
