var vm = require("vm");
var fs = require("fs");
var ctx = vm.createContext({
  TextEncoder: require("util").TextEncoder,
  TextDecoder: require("util").TextDecoder,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  localStorage: { _d: {}, getItem: function(k){return this._d[k]||null;}, setItem: function(k,v){this._d[k]=v;} },
  confirm: function(){return true;}, alert: function(){},
  document: {
    head: { appendChild: function(){} },
    documentElement: { style: {} },
    querySelector: function(){return null;},
    querySelectorAll: function(){return [];},
    addEventListener: function(){},
    createElement: function(){return {setAttribute:function(){},appendChild:function(){},insertAdjacentHTML:function(){},addEventListener:function(){},removeEventListener:function(){},classList:{toggle:function(){return false;},add:function(){},remove:function(){}},contentEditable:false,innerText:""};},
    getElementById: function(){return null;},
    body: { appendChild: function(){}, removeChild: function(){} }
  },
  window: { addEventListener: function(){}, scrollTo: function(){}, open: function(){return null;} },
  location: { hash: "#", reload: function(){} },
  URL: { createObjectURL: function(){return "blob:x";}, revokeObjectURL: function(){} },
  Blob: function Blob(parts, opts) { this.parts = parts; this.type = opts && opts.type; this.size = parts.reduce(function(s,p){return s+(p&&p.length||0);},0); },
  fetch: async function(){ return { ok:true, status:200, text:async function(){return JSON.stringify(ctx.SAMPLE_RESPONSE);}, json:async function(){return ctx.SAMPLE_RESPONSE;} }; }
});

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
ctx.SlideForgeConfig = { PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-2.5-flash', OPENAI_API_KEY: '', OPENAI_BASE_URL: 'https://api.openai.com/v1', OPENAI_MODEL: 'gpt-4.1-mini', REPO_URL: 'https://github.com/vincenzo-afk/SlideForge', APP_NAME: 'SlideForge', STORAGE_KEY: 'slideforge.decks.v1' };
ctx.SAMPLE_RESPONSE = { candidates: [{ content: { parts: [{ text: JSON.stringify(SAMPLE_DECK) }] } }] };

["js/config.js","js/ai.js","js/slides.js","js/editor.js","js/export.js"].forEach(function(p){
  vm.runInContext(fs.readFileSync(p,"utf8"), ctx, { filename: p });
});

var tests = [
  "lastDeck = await SlideForgeAI.generateDeck('The water cycle', { slideCount: 8 }); console.log('T1 generateDeck:', JSON.stringify({slides: lastDeck.slides.length, title: lastDeck.slides[0].title, accent: lastDeck.theme.accent, name: lastDeck.theme.name}));",
  "var e1 = SlideForgeAI.extractJSON('```json\\n{\"a\":1}\\n```'), e2 = SlideForgeAI.extractJSON('no json here'); console.log('T2 extractJSON:', JSON.stringify({fences: !!e1 && e1.a === 1, junk: e2 === null}));",
  "SlideForgeSlides.loadDeck(lastDeck); SlideForgeEditor.save(); var all = SlideForgeEditor.loadAll(); console.log('T3 persistence:', all.length === 1 && all[0].id === lastDeck.id ? 'PASS' : 'FAIL');"
];
(async function(){
  for (var t of tests) { await vm.runInContext("(async function(){" + t + "})()", ctx); }
  // PPTX download test
  vm.runInContext(`
    var downloaded = null;
    var orig = document.createElement;
    document.createElement = function(tag){
      if (tag !== 'a') return orig(tag);
      return { set href(v){}, set download(v){ downloaded = v; }, click: function(){} };
    };
    SlideForgeExport.downloadPPTX();
    console.log('T4 PPTX export:', downloaded ? ('PASS (' + downloaded + ')') : 'FAIL');
  `, ctx);
})();
