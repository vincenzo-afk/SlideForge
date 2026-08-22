/**
 * SlideForge — Slide render engine
 * Turns a deck model into a styled, navigable slideshow DOM.
 */
var SlideForgeSlides = (function () {
  "use strict";

  var state = { deck: null, index: 0, editing: false };

  function $(sel, root) { return (root || document).querySelector(sel); }

  function applyTheme(theme) {
    var root = document.documentElement;
    var style = $("#sf-theme-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "sf-theme-styles";
      document.head.appendChild(style);
    }
    var cssVars =
      "--sf-accent:" + theme.accent + ";" +
      "--sf-bg:" + theme.bg + ";" +
      "--sf-fg:" + theme.fg + ";" +
      "--sf-heading-font:" + theme.headingFont + ";" +
      "--sf-body-font:" + theme.bodyFont + ";";
    var gradRule = theme.gradient ? ".sf-slide{background:" + theme.gradient + ";}" : "";
    style.textContent = ":root{" + cssVars + "}" + gradRule;
    if (theme.gradient) {
      $("#sf-stage") && ($("#sf-stage").style.background = theme.gradient);
    }
  }

  function slideClass(i, total) {
    if (i === 0) return "sf-slide sf-slide-title";
    if (i === total - 1) return "sf-slide sf-slide-closing";
    return "sf-slide sf-slide-content";
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderSlide(deck, i) {
    var slide = deck.slides[i];
    var total = deck.slides.length;
    var el = document.createElement("article");
    el.className = slideClass(i, total);
    el.dataset.index = i;
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Slide " + (i + 1) + " of " + total);

    if (i === 0) {
      el.innerHTML =
        '<div class="sf-inner"><h1 class="sf-slide-title-text">' + esc(slide.title) + '</h1>' +
        (slide.content[0] ? '<p class="sf-subtitle">' + esc(slide.content[0]) + '</p>' : "") +
        (slide.content[1] ? '<p class="sf-author">' + esc(slide.content[1]) + '</p>' : "") +
        "</div>";
    } else if (i === total - 1) {
      el.innerHTML =
        '<div class="sf-inner"><h1 class="sf-slide-title-text">' + esc(slide.title) + '</h1>' +
        (slide.content[0] ? '<p class="sf-closing-line">' + esc(slide.content[0]) + '</p>' : "") +
        (slide.content[1] ? '<p class="sf-takeaway">' + esc(slide.content[1]) + '</p>' : "") +
        "</div>";
    } else {
      var bullets = slide.content.map(function (c) {
        return '<li class="sf-bullet">' + esc(c) + "</li>";
      }).join("");
      el.innerHTML =
        '<div class="sf-inner"><h2 class="sf-slide-title-text">' + esc(slide.title) + '</h2>' +
        '<ul class="sf-bullets">' + bullets + "</ul></div>";
    }

    if (slide.notes) {
      el.insertAdjacentHTML("beforeend",
        '<div class="sf-notes">Speaker notes: ' + esc(slide.notes) + "</div>");
    }
    return el;
  }

  function renderToolbar() {
    var deck = state.deck, i = state.index, total = deck.slides.length;
    var tb = $("#sf-toolbar");
    tb.innerHTML = "";

    var btn = function (label, cls, handler) {
      var b = document.createElement("button");
      b.className = "sf-btn " + (cls || "");
      b.textContent = label;
      b.addEventListener("click", handler);
      return b;
    };
    tb.appendChild(btn("\u25C0 Prev", "sf-btn-nav", function () { navigate(-1); }));
    tb.appendChild(btn("\u270E Edit", "sf-btn-ghost", function () { SlideForgeEditor.toggleEdit(); }));
    tb.appendChild(btn("+ Slide", "sf-btn-ghost", function () { SlideForgeEditor.addSlide(); }));
    tb.appendChild(btn("\u2699 Theme", "sf-btn-ghost", function () { cycleTheme(); }));
    tb.appendChild(btn("\u25B6 Next", "sf-btn-nav", function () { navigate(1); }));

    var counter = document.createElement("span");
    counter.className = "sf-counter";
    counter.textContent = (i + 1) + " / " + total;
    tb.appendChild(counter);

    tb.appendChild(btn("\u2913 PDF", "sf-btn-action", function () { SlideForgeExport.printPDF(); }));
    tb.appendChild(btn("\u2B73 PPTX", "sf-btn-action", function () { SlideForgeExport.downloadPPTX(); }));
    tb.appendChild(btn("\u21B5 New", "sf-btn-ghost", function () { SlideForgeApp.goHome(); }));
  }

  function render() {
    var stage = $("#sf-stage");
    if (!stage) return;
    if (!state.deck) { stage.innerHTML = ""; return; }
    applyTheme(state.deck.theme);
    stage.innerHTML = "";
    stage.appendChild(renderSlide(state.deck, state.index));
    renderToolbar();
    window.scrollTo(0, 0);
  }

  function navigate(delta) {
    var total = state.deck.slides.length;
    state.index = (state.index + delta + total) % total;
    render();
  }

  function goTo(i) {
    state.index = Math.max(0, Math.min(state.deck.slides.length - 1, i));
    render();
  }

  function cycleTheme() {
    var fb = SlideForgeAI.FALLBACK_THEMES;
    var cur = fb.findIndex(function (t) { return t.name === state.deck.theme.name; });
    state.deck.theme = fb[(cur + 1) % fb.length];
    SlideForgeEditor.save();
    render();
  }

  return {
    loadDeck: function (deck) { state.deck = deck; state.index = 0; render(); },
    getDeck: function () { return state.deck; },
    getIndex: function () { return state.index; },
    render: render,
    navigate: navigate,
    goTo: goTo,
    cycleTheme: cycleTheme,
    applyTheme: applyTheme
  };
})();
