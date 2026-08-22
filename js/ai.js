/**
 * SlideForge — AI module
 * Calls an LLM to generate presentation content + theme as structured JSON.
 * Works with Gemini (REST) or any OpenAI-compatible endpoint.
 */
if (typeof SlideForgeAI === "undefined") {
var SlideForgeAI = (function () {
  "use strict";

  var DEFAULTS = {
    slideCount: 8,
    audience: "general audience",
    tone: "professional"
  };

  var FALLBACK_THEMES = [
    { name: "Midnight Forge", bg: "#0f172a", fg: "#e2e8f0", accent: "#6366f1",
      gradient: "linear-gradient(135deg,#0f172a 0%,#312e81 60%,#6366f1 100%)",
      headingFont: "Georgia, serif", bodyFont: "system-ui, sans-serif" },
    { name: "Coral Bloom", bg: "#fff7ed", fg: "#1c1917", accent: "#f43f5e",
      gradient: "linear-gradient(135deg,#fff7ed 0%,#ffe4e6 60%,#fda4af 100%)",
      headingFont: "Georgia, serif", bodyFont: "system-ui, sans-serif" },
    { name: "Forest Ledger", bg: "#f0fdf4", fg: "#14532d", accent: "#16a34a",
      gradient: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 60%,#86efac 100%)",
      headingFont: "system-ui, sans-serif", bodyFont: "Georgia, serif" },
    { name: "Ocean Ink", bg: "#eff6ff", fg: "#0c4a6e", accent: "#0284c7",
      gradient: "linear-gradient(135deg,#eff6ff 0%,#e0f2fe 60%,#7dd3fc 100%)",
      headingFont: "system-ui, sans-serif", bodyFont: "system-ui, sans-serif" },
    { name: "Ember Slate", bg: "#18181b", fg: "#fafafa", accent: "#f59e0b",
      gradient: "linear-gradient(135deg,#18181b 0%,#27272a 60%,#78716c 100%)",
      headingFont: "Georgia, serif", bodyFont: "system-ui, sans-serif" }
  ];

  var SYSTEM_PROMPT =
    "You are a presentation-design expert. Generate a complete slide deck as " +
    "JSON. The JSON MUST have exactly two top-level keys: \"slides\" (array) " +
    "and \"theme\" (object). Each slide object: {\"title\": string, " +
    "\"content\": [array of 3-6 short strings], \"notes\": string}. " +
    "Slide 1 is the title slide: content[0] = subtitle, content[1] = author line. " +
    "Last slide is a closing slide: content = [one thank-you line, one takeaway]. " +
    "Theme object: {\"name\": string, \"accent\": hex string, \"gradient\": " +
    "css linear-gradient string, \"headingFont\": string, \"bodyFont\": string}. " +
    "Match theme colors to the topic. Output ONLY valid JSON, no markdown fences.";

  function buildUserPrompt(topic, options) {
    var count = options.slideCount || DEFAULTS.slideCount;
    var audience = options.audience || DEFAULTS.audience;
    var tone = options.tone || DEFAULTS.tone;
    return [
      "Topic: " + topic,
      "Number of slides: " + Math.max(3, Math.min(20, count)),
      "Audience: " + audience,
      "Tone: " + tone,
      "Write clear, accurate, well-structured content. Keep bullets concise " +
      "(under 14 words each). Generate all " + Math.max(3, Math.min(20, count)) +
      " slides."
    ].join("\n");
  }

  /** Extract the first JSON object from arbitrary text (robust to fences/chatter). */
  function extractJSON(text) {
    var t = text.replace(/```(?:json)?/gi, "").trim();
    var start = t.indexOf("{");
    var end = t.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) return null;
    var cand = t.slice(start, end + 1);
    try { return JSON.parse(cand); } catch (e) { return null; }
  }

  /** Normalize AI output into a validated slide deck. */
  function normalizeDeck(raw, requestedCount) {
    var deck = null;
    try { deck = JSON.parse(raw); } catch (e) { deck = extractJSON(raw); }
    if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) {
      throw new Error("The AI returned no slides. Please try again.");
    }

    var slides = deck.slides.map(function (s, i) {
      return {
        title: (s.title || "Slide " + (i + 1)).slice(0, 200),
        content: Array.isArray(s.content) ? s.content.map(String).slice(0, 8) : [],
        notes: (s.notes || "").slice(0, 500)
      };
    });

    var theme = (deck.theme && typeof deck.theme === "object") ? deck.theme : {};
    var accent = /^[#][0-9a-fA-F]{3,8}$/.test(theme.accent) ? theme.accent : null;
    var themeObj = {
      name: theme.name || FALLBACK_THEMES[0].name,
      bg: theme.bg || FALLBACK_THEMES[0].bg,
      fg: theme.fg || FALLBACK_THEMES[0].fg,
      accent: accent || FALLBACK_THEMES[0].accent,
      gradient: /^linear-gradient/.test(theme.gradient) ? theme.gradient : null,
      headingFont: theme.headingFont || FALLBACK_THEMES[0].headingFont,
      bodyFont: theme.bodyFont || FALLBACK_THEMES[0].bodyFont
    };
    if (!themeObj.gradient) {
      var a = themeObj.accent;
      themeObj.gradient = "linear-gradient(135deg," + themeObj.bg + " 0%," + a + " 100%)";
    }
    return { id: "deck-" + Date.now(), topic: "", slides: slides, theme: themeObj, createdAt: Date.now() };
  }

  async function callGemini(prompt) {
    if (!SlideForgeConfig.GEMINI_API_KEY) {
      throw new Error("No Gemini API key set. Open js/config.js and add your GEMINI_API_KEY (free at https://aistudio.google.com/app/apikey).");
    }
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      SlideForgeConfig.GEMINI_MODEL + ":generateContent?key=" +
      encodeURIComponent(SlideForgeConfig.GEMINI_API_KEY);
    var res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\n" + prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 16384 }
      })
    });
    if (!res.ok) {
      var err = await res.text();
      throw new Error("Gemini error " + res.status + ": " + err.slice(0, 200));
    }
    var data = await res.json();
    var text = (data.candidates || [])[0];
    if (!text || !text.content || !text.content.parts || !text.content.parts[0]) {
      throw new Error("Gemini returned an empty response (safety filter?). Try rephrasing.");
    }
    return text.content.parts[0].text;
  }

  async function callOpenAI(prompt) {
    if (!SlideForgeConfig.OPENAI_API_KEY) {
      throw new Error("No OpenAI-compatible API key set. Open js/config.js and add your OPENAI_API_KEY / endpoint.");
    }
    var res = await fetch(SlideForgeConfig.OPENAI_BASE_URL.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SlideForgeConfig.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: SlideForgeConfig.OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 16000
      })
    });
    if (!res.ok) {
      var err = await res.text();
      throw new Error("OpenAI-compat error " + res.status + ": " + err.slice(0, 200));
    }
    var data = await res.json();
    var content = (data.choices || [])[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error("API returned an empty response. Please try again.");
    return content;
  }

  /** Main entry: generate a full deck from a topic string. */
  async function generateDeck(topic, options) {
    var prompt = buildUserPrompt(topic, options || {});
    var raw;
    if (SlideForgeConfig.PROVIDER === "gemini") {
      raw = await callGemini(prompt);
    } else {
      raw = await callOpenAI(prompt);
    }
    var deck = normalizeDeck(raw, (options || {}).slideCount);
    deck.topic = topic;
    return deck;
  }

  return {
    generateDeck: generateDeck,
    FALLBACK_THEMES: FALLBACK_THEMES,
    extractJSON: extractJSON,
    normalizeDeck: normalizeDeck
  };
})();
}
