/**
 * SlideForge — Inline editor
 * Add / duplicate / delete / reorder slides; inline content editing;
 * localStorage persistence.
 */
var SlideForgeEditor = (function () {
  "use strict";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function save() {
    try {
      var decks = loadAll();
      var deck = SlideForgeSlides.getDeck();
      if (!deck) return;
      var idx = decks.findIndex(function (d) { return d.id === deck.id; });
      if (idx > -1) decks[idx] = deck; else decks.unshift(deck);
      localStorage.setItem(SlideForgeConfig.STORAGE_KEY, JSON.stringify(decks.slice(0, 10)));
    } catch (e) { /* storage unavailable — ignore */ }
  }

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(SlideForgeConfig.STORAGE_KEY) || "[]");
    } catch (e) { return []; }
  }

  function toggleEdit() {
    var stage = document.getElementById("sf-stage");
    var editing = stage.classList.toggle("sf-editing");
    var texts = stage.querySelectorAll(".sf-slide-title-text, .sf-subtitle, .sf-author, .sf-closing-line, .sf-takeaway, .sf-bullet");
    texts.forEach(function (el) {
      el.contentEditable = editing;
      el.setAttribute("spellcheck", "true");
      if (editing) {
        el.addEventListener("input", onTextChange);
        el.classList.add("sf-editable");
      } else {
        el.removeEventListener("input", onTextChange);
        el.classList.remove("sf-editable");
      }
    });
    // bullet list reflow
    stage.querySelectorAll(".sf-bullets").forEach(function (ul) {
      ul.contentEditable = editing;
    });
    var deck = SlideForgeSlides.getDeck();
    if (editing && deck) {
      deck.edited = Date.now();
    }
    save();
    SlideForgeSlides.renderToolbar();
  }

  var saveTimer = null;
  function onTextChange() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var deck = SlideForgeSlides.getDeck();
      var i = SlideForgeSlides.getIndex();
      var slide = deck.slides[i];
      var stage = document.getElementById("sf-stage");
      var h = stage.querySelector(".sf-slide-title-text");
      if (h) slide.title = h.innerText.trim();
      var bullets = stage.querySelectorAll(".sf-bullet");
      if (bullets.length) {
        slide.content = Array.from(bullets).map(function (b) { return b.innerText.trim(); }).filter(Boolean);
      } else {
        var subs = stage.querySelectorAll(".sf-subtitle, .sf-author, .sf-closing-line, .sf-takeaway");
        slide.content = Array.from(subs).map(function (b) { return b.innerText.trim(); });
      }
      save();
    }, 400);
  }

  function addSlide() {
    var deck = SlideForgeSlides.getDeck();
    var i = SlideForgeSlides.getIndex();
    deck.slides.splice(i + 1, 0, {
      title: "New Slide",
      content: ["Click \u270E Edit to change this text", "Add your key points here", "Keep bullets concise"],
      notes: ""
    });
    save();
    SlideForgeSlides.goTo(i + 1);
  }

  function duplicateSlide() {
    var deck = SlideForgeSlides.getDeck();
    var i = SlideForgeSlides.getIndex();
    var copy = JSON.parse(JSON.stringify(deck.slides[i]));
    copy.title = copy.title + " (copy)";
    deck.slides.splice(i + 1, 0, copy);
    save();
    SlideForgeSlides.goTo(i + 1);
  }

  function deleteSlide() {
    var deck = SlideForgeSlides.getDeck();
    if (deck.slides.length <= 3) {
      alert("A deck needs at least 3 slides.");
      return;
    }
    if (!confirm("Delete this slide?")) return;
    var i = SlideForgeSlides.getIndex();
    deck.slides.splice(i, 1);
    save();
    SlideForgeSlides.goTo(Math.min(i, deck.slides.length - 1));
  }

  function moveSlide(delta) {
    var deck = SlideForgeSlides.getDeck();
    var i = SlideForgeSlides.getIndex();
    var j = i + delta;
    if (j < 0 || j >= deck.slides.length) return;
    var tmp = deck.slides[i];
    deck.slides[i] = deck.slides[j];
    deck.slides[j] = tmp;
    save();
    SlideForgeSlides.goTo(j);
  }

  return {
    toggleEdit: toggleEdit,
    addSlide: addSlide,
    duplicateSlide: duplicateSlide,
    deleteSlide: deleteSlide,
    moveSlide: moveSlide,
    save: save,
    loadAll: loadAll
  };
})();
