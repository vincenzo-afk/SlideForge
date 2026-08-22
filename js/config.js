/**
 * SlideForge — Configuration
 * ==========================
 * ONE place to configure the AI backend. No frameworks, no build step.
 *
 * Providers supported out of the box (set PROVIDER accordingly):
 *   "openai"   — OpenAI-compatible endpoints (OpenAI, Groq, Together,
 *                LocalAI, vLLM, LM Studio, ...)
 *   "gemini"   — Google Gemini REST API (free tier available)
 *
 * GET A FREE KEY (Gemini):
 *   1. Go to https://aistudio.google.com/app/apikey
 *   2. Sign in with a Google account
 *   3. Click "Create API key" → paste it into GEMINI_API_KEY below
 *
 * SECURITY NOTE: this is a client-side app; the key lives in the browser.
 * That is fine for personal use / demos. For production with a shared key,
 * route requests through your own thin backend proxy.
 */
if (typeof SlideForgeConfig === "undefined") {
var SlideForgeConfig = {
  PROVIDER: "gemini",          // "gemini" | "openai"

  // --- Gemini (default, free tier) ---
  GEMINI_API_KEY: "",          // paste your Gemini API key here
  GEMINI_MODEL: "gemini-2.5-flash",

  // --- OpenAI-compatible (optional) ---
  OPENAI_API_KEY: "",          // paste your key here
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  OPENAI_MODEL: "gpt-4.1-mini",

  // --- App ---
  REPO_URL: "https://github.com/vincenzo-afk/SlideForge",
  APP_NAME: "SlideForge",
  STORAGE_KEY: "slideforge.decks.v1"
};
}
