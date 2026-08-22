/**
 * SlideForge — App wiring
 * Routing (#editor), generation flow, keyboard nav, saved decks, events.
 */
var SlideForgeApp = (function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

  function showStatus(msg, isError) {
    var box = $("#sf-status");
    if (!box) return;
    box.textContent = msg;
    box.className = "sf-status " + (isError ? "sf-status-error" : "sf-status-info");
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(function () { box.className = "sf-status"; }, isError ? 8000 : 3000);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    var topic = ($("#sf-topic").value || "").trim();
    if (!topic) { $("#sf-topic").focus(); return; }
    var count = parseInt($("#sf-count").value, 10) || 8;
    var audience = ($("#sf-audience").value || "").trim();
    var tone = ($("#sf-tone").value || "");

    var btn = $("#sf-generate-btn");
    btn.disabled = true;
    btn.textContent = "Forging your slides...";
    showStatus("Calling the AI — this takes a few seconds...");

    try {
      var deck = await SlideForgeAI.generateDeck(topic, { slideCount: count, audience: audience, tone: tone });
      SlideForgeEditor.save();
      SlideForgeSlides.loadDeck(deck);
      location.hash = "#editor";
      showStatus("Deck forged! Use arrow keys, click \u270E Edit, or export.");
    } catch (err) {
      showStatus("Error: " + err.message, true);
    } finally {
      btn.disabled = false;
      btn.textContent = "Forge Slides \u26A1";
    }
  }

  function renderHome() {
    $("#sf-home").style.display = "";
    $("#sf-editor").style.display = "none";
    var box = $("#sf-saved");
    var decks = SlideForgeEditor.loadAll();
    box.innerHTML = "";
    if (decks.length) {
      var h = document.createElement("h3");
      h.textContent = "Recent decks";
      box.appendChild(h);
      decks.forEach(function (d) {
        var b = document.createElement("button");
        b.className = "sf-saved-btn";
        b.textContent = d.topic || d.theme.name;
        b.title = (d.slides ? d.slides.length : 0) + " slides \u00B7 " + d.theme.name;
        b.addEventListener("click", function () {
          SlideForgeSlides.loadDeck(d);
          location.hash = "#editor";
        });
        box.appendChild(b);
      });
    }
  }

  function renderEditor() {
    $("#sf-home").style.display = "none";
    $("#sf-editor").style.display = "";
    if (!SlideForgeSlides.getDeck()) { location.hash = "#"; return; }
    SlideForgeSlides.render();
  }

  function goHome() {
    SlideForgeSlides.loadDeck(null);
    location.hash = "#";
  }

  function onRoute() {
    if (location.hash === "#editor") renderEditor(); else renderHome();
  }

  function onKeyDown(e) {
    if (location.hash !== "#editor" || !SlideForgeSlides.getDeck()) return;
    var focused = document.activeElement;
    var inEditor = focused && (focused.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName));
    if (inEditor) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); SlideForgeSlides.navigate(1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); SlideForgeSlides.navigate(-1); }
    if (e.key === "Escape") SlideForgeEditor.toggleEdit();
  }

  function init() {
    var form = $("#sf-form");
    if (form) form.addEventListener("submit", handleGenerate);

    // example chips
    $$(".sf-example").forEach(function (chip) {
      chip.addEventListener("click", function () {
        $("#sf-topic").value = chip.dataset.topic;
        $("#sf-topic").focus();
      });
    });

    // example prompt prefill
    $$(".sf-example-prompt").forEach(function (el) {
      el.addEventListener("click", function () {
        $("#sf-topic").value = el.dataset.topic;
        $("#sf-audience").value = el.dataset.audience || "";
        $("#sf-count").value = el.dataset.count || 8;
        $("#sf-form").requestSubmit && $("#sf-form").requestSubmit();
      });
    });

    // toolbar delegation for extra editor buttons
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-sf-action]");
      if (!t) return;
      var act = t.dataset.sfAction;
      if (act === "prev") SlideForgeSlides.navigate(-1);
      if (act === "next") SlideForgeSlides.navigate(1);
      if (act === "dup") SlideForgeEditor.duplicateSlide();
      if (act === "del") SlideForgeEditor.deleteSlide();
      if (act === "up") SlideForgeEditor.moveSlide(-1);
      if (act === "down") SlideForgeEditor.moveSlide(1);
    });

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("keydown", onKeyDown);
    onRoute();

    // warn if no key configured and user tries to generate
    if (!SlideForgeConfig.GEMINI_API_KEY && !SlideForgeConfig.OPENAI_API_KEY) {
      var hint = $("#sf-key-hint");
      if (hint) hint.style.display = "";
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return { goHome: goHome, showStatus: showStatus };
})();
