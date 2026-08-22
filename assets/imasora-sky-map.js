(() => {
  "use strict";

  const ROOT_ID = "imasoraSkyMapScreen";
  const WORLD_ID = "imasoraSkyMapWorld";
  const SCENES = [
    { id: "auto", label: "自動" },
    { id: "morning", label: "朝" },
    { id: "day", label: "昼" },
    { id: "evening", label: "夕方" },
    { id: "night", label: "夜" }
  ];
  const SCENE_LABELS = Object.fromEntries(SCENES.map(scene => [scene.id, scene.label]));

  let sceneMode = "auto";
  let sceneTimer = 0;
  let returnHandler = null;
  let buildingNamesVisible = true;

  function sceneForDate(now = new Date()) {
    const hour = now.getHours();
    if (hour >= 19 || hour < 6) return "night";
    if (hour >= 16) return "evening";
    if (hour >= 9) return "day";
    return "morning";
  }

  function currentScene() {
    return sceneMode === "auto" ? sceneForDate() : sceneMode;
  }

  function timeText(now = new Date()) {
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    return `${SCENE_LABELS[currentScene()]} ${hour}:${minute}`;
  }

  function sharedTownRailwayMarkup() {
    if (typeof window.ImasoraTownRailwayLayerMarkup === "function") {
      return window.ImasoraTownRailwayLayerMarkup();
    }
    return `
      <div class="town-map-layer town-base-layer skyMapSharedTownTrack" aria-hidden="true"></div>
      <img class="town-layer-sprite town-layer-sprite-station" src="assets/town-layered-station-v2.png" alt="" aria-hidden="true" style="--sprite-x:25.90%;--sprite-y:4.00%;--sprite-w:18.50%;--sprite-h:22.00%;--sprite-z:5;--sprite-r:0deg;">
      <img class="town-layer-sprite town-layer-sprite-train" src="assets/town-layered-train-v2.png" alt="" aria-hidden="true" style="--sprite-x:-3.60%;--sprite-y:10.80%;--sprite-w:44.95%;--sprite-h:19.57%;--sprite-z:6;--sprite-r:0deg;">
      <img class="town-layer-sprite town-layer-sprite-warehouse" src="assets/town-layered-workshop-v1.png" alt="" aria-hidden="true" style="--sprite-x:78.61%;--sprite-y:18.94%;--sprite-w:15.95%;--sprite-h:18.16%;--sprite-z:5;--sprite-r:0deg;">
    `;
  }

  function workshopLabelStyle() {
    if (typeof window.ImasoraSkyWorkshopLabelStyle === "function") {
      return window.ImasoraSkyWorkshopLabelStyle();
    }
    return "--label-x:86.59%;--label-y:34.10%;";
  }

  function stationLabelStyle() {
    if (typeof window.ImasoraSkyStationLabelStyle === "function") {
      return window.ImasoraSkyStationLabelStyle();
    }
    return "--label-x:35.15%;--label-y:23.00%;";
  }

  function worldMarkup() {
    return `
      <span class="skyMapStars" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </span>
      <span class="skyMapUpperGlow" aria-hidden="true"></span>
      <div class="skyMapCloudExpanse" aria-hidden="true">
        <span class="skyMapCloudHorizon"></span>
        <span class="skyMapCloudSurface"></span>
        <span class="skyMapCloudTexture skyMapCloudTextureA"></span>
        <span class="skyMapCloudTexture skyMapCloudTextureB"></span>
        <span class="skyMapCloudTexture skyMapCloudTextureC"></span>
        <span class="skyMapCloudFlow skyMapCloudFlowA"></span>
        <span class="skyMapCloudFlow skyMapCloudFlowB"></span>
        <span class="skyMapCloudFlow skyMapCloudFlowC"></span>
      </div>
      <div class="skyMapTownRailwayLayers" data-sky-shared-town-railway aria-hidden="true">
        ${sharedTownRailwayMarkup()}
      </div>
      <span class="skyMapRailCloudVeil skyMapRailCloudVeilA" aria-hidden="true"></span>
      <span class="skyMapRailCloudVeil skyMapRailCloudVeilB" aria-hidden="true"></span>
      <span class="town-facility-name nowrap skyMapBuildingName" data-sky-building-name style="${stationLabelStyle()}">空駅</span>
      <span class="town-facility-name nowrap skyMapBuildingName" data-sky-building-name style="${workshopLabelStyle()}">雲づくり工房</span>
      <span class="skyMapAerialMark" aria-hidden="true"></span>
    `;
  }

  function ensureWorld() {
    const world = document.getElementById(WORLD_ID);
    if (!world) return null;
    if (world.dataset.skyBuilt !== "true") {
      world.innerHTML = worldMarkup();
      world.dataset.skyBuilt = "true";
    }
    return world;
  }

  function applyScene() {
    const root = document.getElementById(ROOT_ID);
    const world = ensureWorld();
    if (!root || !world) return;
    const scene = currentScene();
    world.dataset.skyScene = scene;
    const railway = world.querySelector("[data-sky-shared-town-railway]");
    if (railway) railway.className = `skyMapTownRailwayLayers town-scene-${scene}`;
    root.dataset.skySceneMode = sceneMode;
    const readout = root.querySelector("[data-sky-scene-readout]");
    if (readout) readout.textContent = sceneMode === "auto" ? `自動・${timeText()}` : SCENE_LABELS[scene];
    root.querySelectorAll("[data-sky-scene]").forEach(button => {
      const active = button.dataset.skyScene === sceneMode;
      button.classList.toggle("isActive", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    applyBuildingNames(root);
  }

  function applyBuildingNames(root = document.getElementById(ROOT_ID)) {
    if (!root) return;
    root.querySelectorAll("[data-sky-building-name]").forEach(label => {
      label.hidden = !buildingNamesVisible;
    });
    const button = root.querySelector("[data-sky-building-toggle]");
    if (button) {
      button.textContent = buildingNamesVisible ? "建造物名を消す" : "建造物名を表示";
      button.setAttribute("aria-pressed", buildingNamesVisible ? "true" : "false");
    }
  }

  function toggleBuildingNames() {
    buildingNamesVisible = !buildingNamesVisible;
    applyBuildingNames();
  }

  function setSceneMode(mode) {
    if (!SCENES.some(scene => scene.id === mode)) return;
    sceneMode = mode;
    applyScene();
  }

  function bindRoot(root) {
    if (root.dataset.skyBound === "true") return;
    root.dataset.skyBound = "true";
    root.querySelector("[data-sky-return]")?.addEventListener("click", () => {
      if (typeof returnHandler === "function") returnHandler();
    });
    root.querySelectorAll("[data-sky-scene]").forEach(button => {
      button.addEventListener("click", () => setSceneMode(button.dataset.skyScene));
    });
    root.querySelector("[data-sky-building-toggle]")?.addEventListener("click", toggleBuildingNames);
  }

  function mount(options = {}) {
    const root = document.getElementById(ROOT_ID);
    if (!root) return false;
    returnHandler = typeof options.onReturn === "function" ? options.onReturn : returnHandler;
    ensureWorld();
    bindRoot(root);
    applyScene();
    clearInterval(sceneTimer);
    sceneTimer = window.setInterval(() => {
      if (sceneMode === "auto") applyScene();
    }, 60000);
    return true;
  }

  function unmount() {
    clearInterval(sceneTimer);
    sceneTimer = 0;
  }

  window.ImasoraSkyMap = Object.freeze({
    mount,
    unmount,
    setSceneMode,
    currentScene,
    sceneForDate
  });
})();
