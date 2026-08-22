/* Headless functional test for SlideForge core logic (runs in Node).
   Simulates fetch/TextEncoder globals, loads modules in order, and verifies
   generation, normalization, and PPTX ZIP output. */
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

// --- fake fetch returning a Gemini-style JSON response ---
var SAMPLE_DECK = {
  slides: [
    { title: "The Water Cycle", content: ["Water evaporates from oceans and lakes", "Clouds form as vapor condenses", "Precipitation returns water to Earth"], notes: "Explain each stage simply." },
    { title: "Why It Matters", content: ["Sustains all life on Earth", "Shapes climate and weather"], notes: "" },
    { title: "Thank You", content: ["Water is a shared resource", "Every drop counts"], notes: "" }
  ],
  theme: { name: "Aqua Test", accent: "#0284c7", bg: "#eff6ff", fg: "#0c4a6e",
    gradient: "linear-gradient(135deg,#eff6ff 0%,#0284c7 100%)",
    headingFont: "Georgia, serif", bodyFont: "system-ui" }
};

var SAMPLE_RESPONSE = {
  candidates: [{ content: { parts: [{ text: JSON.stringify(SAMPLE_DECK) }] } }]
};

global.fetch = async function (url, opts) {
  return {
    ok: true, status: 200,
    text: async function () { return JSON.stringify(SAMPLE_RESPONSE); },
    json: async function () { return SAMPLE_RESPONSE; }
  };
};

// minimal DOM shims so modules load
global.localStorage = { _d: {}, getItem: function (k) { return this._d[k] || null; }, setItem: function (k, v) { this._d[k] = v; } };
global.document = {
  head: { appendChild: function () {} },
  documentElement: { style: {} },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  createElement: function () { return { setAttribute: function(){}, appendChild: function(){}, insertAdjacentHTML: function(){} }; },
  getElementById: function () { return null; }
};
global.window = { addEventListener: function(){}, scrollTo: function(){}, scrollTo: 0 };
global.location = { hash: "#", reload: function(){} };
global.URL = { createObjectURL: function(){return "blob:x";}, revokeObjectURL: function(){} };
global.Blob = require("buffer").Blob;
global.confirm = function(){return true;};
global.alert = function(){};
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;

function load(path) { require(path); }
load("./js/config.js");
load("./js/ai.js");
load("./js/slides.js");
load("./js/editor.js");
load("./js/export.js");

(async function () {
  var pass = 0, fail = 0;
  function check(name, cond) { if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name); } }

  var deck = await SlideForgeAI.generateDeck("The water cycle", { slideCount: 8 });
  check("generateDeck returns 3 slides", deck.slides.length === 3);
  check("first slide is title", deck.slides[0].title === "The Water Cycle");
  check("theme accent normalized", deck.theme.accent === "#0284c7");
  check("theme name present", deck.theme.name === "Aqua Test");

  // JSON extraction robustness
  check("extractJSON from fences", JSON.parse(JSON.stringify(SlideForgeAI.extractJSON("```json\n{\"a\":1}\n```"))).a === 1);
  check("extractJSON from chatter", SlideForgeAI.extractJSON("Here you go:\n{\"slides\":[],\"theme\":{}}") !== null);
  check("extractJSON rejects junk", SlideForgeAI.extractJSON("no json here") === null);

  // editor persistence
  SlideForgeSlides.loadDeck(deck);
  SlideForgeEditor.save();
  var all = SlideForgeEditor.loadAll();
  check("deck persisted to localStorage", all.length === 1 && all[0].id === deck.id);

  // add / duplicate / delete / move
  var before = deck.slides.length;
  SlideForgeEditor.addSlide(); check("addSlide +1", deck.slides.length === before + 1);
  SlideForgeEditor.duplicateSlide(); check("duplicateSlide +1", deck.slides.length === before + 2);
  SlideForgeEditor.moveSlide(1); check("moveSlide doesn't change count", deck.slides.length === before + 2);
  SlideForgeEditor.deleteSlide(); check("deleteSlide -1", deck.slides.length === before + 1);
  SlideForgeEditor.deleteSlide(); check("deleteSlide -2", deck.slides.length === before);

  // PPTX export builds a valid store ZIP
  global.Blob = function (parts, opts) { this.parts = parts; this.type = opts.type; this.size = parts.reduce(function(s,p){return s+p.length;},0); };
  global.document.body = { appendChild: function(){}, removeChild: function(){} };
  var downloaded = null;
  var origA = global.document.createElement;
  global.document.createElement = function (tag) {
    if (tag !== "a") return origA(tag);
    return {
      set href(v){},
      set download(v){ downloaded = v; },
      click: function () {}
    };
  };
  SlideForgeExport.downloadPPTX();
  check("PPTX download triggered with .pptx name", downloaded && downloaded.endsWith(".pptx"));
  console.log("  downloaded file:", downloaded);

  console.log("\nResult: " + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
