(function () {
  "use strict";

  const sceneOptions = [
    { id: "auto", label: "自動" },
    { id: "morning", label: "朝" },
    { id: "day", label: "昼" },
    { id: "evening", label: "夕方" },
    { id: "night", label: "夜" }
  ];

  let sceneMode = "auto";
  let sceneTimer = 0;
  let callbacks = {};
  let bound = false;

  function sceneForDate(now = new Date()) {
    const hour = now.getHours();
    if (hour >= 19 || hour < 6) return "night";
    if (hour >= 16) return "evening";
    if (hour >= 9) return "day";
    return "morning";
  }

  function sceneLabel(id) {
    return sceneOptions.find(item => item.id === id)?.label || id;
  }

  function activeScene() {
    return sceneMode === "auto" ? sceneForDate() : sceneMode;
  }

  function lightMarkup() {
    return `<div class="coastalTownNightLights" aria-hidden="true">${Array.from({ length: 14 }, () => "<i></i>").join("")}</div>`;
  }

  function worldMarkup() {
    return `
      <img class="coastalTownBase" src="assets/imasora-coastal-town-base-v1.png" alt="" aria-hidden="true">
      <div class="coastalTownSeaShimmer" aria-hidden="true"></div>
      ${lightMarkup()}
    `;
  }

  function ensureWorld() {
    const world = document.getElementById("imasoraCoastalTownWorld");
    if (!world) return null;
    if (!world.dataset.coastalRendered) {
      world.innerHTML = worldMarkup();
      world.dataset.coastalRendered = "true";
    }
    return world;
  }

  function updateScene() {
    const world = ensureWorld();
    if (!world) return;
    const scene = activeScene();
    world.dataset.coastalScene = scene;
    document.querySelectorAll("[data-coastal-town-scene]").forEach(button => {
      const selected = button.dataset.coastalTownScene === sceneMode;
      button.classList.toggle("isActive", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const readout = document.querySelector("[data-coastal-town-scene-readout]");
    if (readout) {
      const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
      readout.textContent = sceneMode === "auto" ? `自動・${sceneLabel(scene)} ${time}` : sceneLabel(scene);
    }
  }

  function scheduleSceneClock() {
    clearInterval(sceneTimer);
    sceneTimer = 0;
    if (sceneMode !== "auto") return;
    sceneTimer = window.setInterval(updateScene, 30000);
  }

  function setScene(id) {
    if (!sceneOptions.some(item => item.id === id)) return;
    sceneMode = id;
    updateScene();
    scheduleSceneClock();
    if (typeof window.playSfx === "function") window.playSfx("select");
  }

  function returnToTown() {
    callbacks.onReturn?.();
  }

  function bind() {
    if (bound) return;
    const screen = document.getElementById("imasoraCoastalTownScreen");
    if (!screen) return;
    bound = true;
    screen.addEventListener("click", event => {
      const sceneButton = event.target.closest("[data-coastal-town-scene]");
      if (sceneButton) {
        setScene(sceneButton.dataset.coastalTownScene);
        return;
      }
      if (event.target.closest("[data-coastal-town-return]")) {
        returnToTown();
      }
    });
  }

  function mount(options = {}) {
    callbacks = options;
    bind();
    ensureWorld();
    updateScene();
    scheduleSceneClock();
  }

  function unmount() {
    clearInterval(sceneTimer);
    sceneTimer = 0;
  }

  function open() {
    if (typeof window.switchScreen !== "function") return;
    window.switchScreen("coastalTown");
    requestAnimationFrame(() => document.getElementById("imasoraCoastalTownWorld")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    if (typeof window.playSfx === "function") window.playSfx("select");
    if (typeof window.toast === "function") window.toast("海岸の街へ移動しました");
  }

  window.ImasoraCoastalTown = { mount, unmount, open, setScene };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bind();
      ensureWorld();
      updateScene();
    }, { once: true });
  } else {
    bind();
    ensureWorld();
    updateScene();
  }
})();
