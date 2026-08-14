import * as THREE from "./three.module.min.js";
import {
  WHITE_MICHI_ROAD_SABER_REN_ID,
  WHITE_MICHI_ROAD_SABER_FLOWERING_ID,
  ALL_MATURE_STAR_CHARACTERS,
  ALL_FLOWERING_HERO_CHARACTERS,
  MATURE_CHARACTER_FAMILIES,
  FLOWERING_CHARACTER_FAMILIES,
  buildMatureStarCharacter360,
  buildFloweringHeroCharacter360,
  disposeMatureCharacterModel,
  setMatureCharacterModelWireframe,
} from "./imasora-character-360.js";

const canvas = document.getElementById("characterCanvas");
const stage = document.getElementById("stage");
const yawRange = document.getElementById("yawRange");
const pitchRange = document.getElementById("pitchRange");
const zoomRange = document.getElementById("zoomRange");
const yawValue = document.getElementById("yawValue");
const pitchValue = document.getElementById("pitchValue");
const viewName = document.getElementById("viewName");
const autoRotate = document.getElementById("autoRotate");
const wireframe = document.getElementById("wireframe");
const showCape = document.getElementById("showCape");
const showCord = document.getElementById("showCord");
const resetView = document.getElementById("resetView");
const saveImage = document.getElementById("saveImage");
const characterSelect = document.getElementById("characterSelect");
const previousCharacter = document.getElementById("previousCharacter");
const nextCharacter = document.getElementById("nextCharacter");
const characterQuickList = document.getElementById("characterQuickList");
const familyFilterList = document.getElementById("familyFilterList");
const characterIndex = document.getElementById("characterIndex");
const currentCharacterName = document.getElementById("currentCharacterName");
const modelIdReadout = document.getElementById("modelIdReadout");
const primaryToggleLabel = document.getElementById("primaryToggleLabel");
const secondaryToggleLabel = document.getElementById("secondaryToggleLabel");
const bodyCheckText = document.getElementById("bodyCheckText");
const decorCheckText = document.getElementById("decorCheckText");
const rearCheckText = document.getElementById("rearCheckText");
const growthStageTabs = document.getElementById("growthStageTabs");
const growthStageTitleText = document.getElementById("growthStageTitleText");
const growthStageLead = document.getElementById("growthStageLead");
const rosterEyebrow = document.getElementById("rosterEyebrow");
const primaryToggleRow = document.getElementById("primaryToggleRow");
const secondaryToggleRow = document.getElementById("secondaryToggleRow");
const directionButtons = [...document.querySelectorAll("[data-yaw]")];

const CATALOGS = Object.freeze({
  flowering: Object.freeze({
    key: "flowering",
    label: "開花期",
    roster: ALL_FLOWERING_HERO_CHARACTERS,
    families: FLOWERING_CHARACTER_FAMILIES,
    defaultCharacterId: WHITE_MICHI_ROAD_SABER_FLOWERING_ID,
    buildModel: buildFloweringHeroCharacter360,
    rosterEyebrow: "ALL FLOWERING HERO ROSTER",
    lead: "完成した満開期の立体形状を共通基盤に、王冠・流星翼・マントを外した通常42種＋白6種の全開花期キャラを確認する専用ページです。"
  }),
  mature: Object.freeze({
    key: "mature",
    label: "満開期",
    roster: ALL_MATURE_STAR_CHARACTERS,
    families: MATURE_CHARACTER_FAMILIES,
    defaultCharacterId: WHITE_MICHI_ROAD_SABER_REN_ID,
    buildModel: buildMatureStarCharacter360,
    rosterEyebrow: "ALL MATURE STAR ROSTER",
    lead: "完成した白18種の立体形状を基準に、通常7系統126種を含む全満開期キャラを同じ品質で確認する専用ページです。"
  })
});

const pageParams = new URL(window.location.href).searchParams;
const requestedCharacterId = pageParams.get("character");
const requestedStage = pageParams.get("stage");
const inferredStage = ALL_FLOWERING_HERO_CHARACTERS.some((item) => item.id === requestedCharacterId)
  ? "flowering"
  : "mature";
const initialStageKey = requestedStage === "flowering" || requestedStage === "mature"
  ? requestedStage
  : inferredStage;
const initialCatalog = CATALOGS[initialStageKey];
const initialCharacterId = initialCatalog.roster.some((item) => item.id === requestedCharacterId)
  ? requestedCharacterId
  : initialCatalog.defaultCharacterId;

const state = {
  yaw: 0,
  pitch: 0,
  zoom: 100,
  growthStage: initialStageKey,
  characterId: initialCharacterId,
  dragging: false,
  pointerId: null,
  previousX: 0,
  previousY: 0,
};

const directionNames = ["正面", "右斜め", "右", "右後ろ", "背面", "左後ろ", "左", "左斜め"];
const normalizeYaw = (value) => ((value % 360) + 360) % 360;
const toRadians = (degrees) => THREE.MathUtils.degToRad(degrees);

let renderer;
let scene;
let camera;
let model;
let resizeObserver;
let animationFrameId;

function currentCatalog() {
  return CATALOGS[state.growthStage] || CATALOGS.mature;
}

function currentRoster() {
  return currentCatalog().roster;
}

function currentDescriptor() {
  return currentRoster().find((item) => item.id === state.characterId)
    || currentRoster()[0];
}

function updateReadout() {
  const yaw = normalizeYaw(state.yaw);
  const nearestDirection = Math.round(yaw / 45) % 8;
  yawRange.value = String(Math.round(yaw));
  pitchRange.value = String(Math.round(state.pitch));
  zoomRange.value = String(Math.round(state.zoom));
  yawValue.textContent = `${Math.round(yaw)}°`;
  pitchValue.textContent = `上下 ${Math.round(state.pitch)}°`;
  viewName.textContent = directionNames[nearestDirection];
  directionButtons.forEach((button) => {
    const buttonDirection = Math.round(Number(button.dataset.yaw) / 45) % 8;
    button.classList.toggle("is-active", buttonDirection === nearestDirection);
  });
}

function updateCamera() {
  if (!camera) return;
  const targetY = model?.userData?.cameraTargetY ?? 78;
  const target = new THREE.Vector3(0, targetY, 0);
  const distanceScale = model?.userData?.cameraDistanceScale ?? 1;
  const distance = 188 * distanceScale * (100 / state.zoom);
  const pitch = toRadians(state.pitch);
  camera.position.set(0, target.y + Math.sin(pitch) * distance * .78, Math.cos(pitch) * distance);
  camera.lookAt(target);
}

function updateView() {
  if (model) model.rotation.y = toRadians(normalizeYaw(state.yaw));
  updateCamera();
  updateReadout();
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function buildLighting() {
  // Keep the inspection light neutral so the family body colors are not
  // desaturated or shifted by cyan/green fill lights.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667080, 1.15));
  scene.add(new THREE.AmbientLight(0xffffff, .58));

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(-95, 160, 135);
  key.castShadow = true;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, .82);
  fill.position.set(120, 95, 80);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, .9);
  rim.position.set(0, 110, -135);
  scene.add(rim);
}

function buildPedestal() {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(42, 48, 4.5, 72),
    new THREE.MeshStandardMaterial({
      color: 0x0c2a3d,
      metalness: .7,
      roughness: .3,
      emissive: 0x06273a,
      emissiveIntensity: .75,
    }),
  );
  base.position.y = 37;
  base.receiveShadow = true;
  scene.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(44, 1.15, 10, 72),
    new THREE.MeshBasicMaterial({ color: 0x66e9ff, transparent: true, opacity: .78 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 39.35;
  scene.add(ring);
}

function updateCharacterControls(descriptor) {
  const catalog = currentCatalog();
  const roster = catalog.roster;
  const index = roster.findIndex((item) => item.id === descriptor.id);
  const familyItems = roster.filter((item) => item.familyKey === descriptor.familyKey);
  const familyIndex = familyItems.findIndex((item) => item.id === descriptor.id);
  characterSelect.value = descriptor.id;
  characterIndex.textContent = `${index + 1} / ${roster.length} · ${descriptor.familyLabel} ${familyIndex + 1} / ${familyItems.length}`;
  currentCharacterName.textContent = descriptor.name;
  modelIdReadout.textContent = descriptor.id;
  canvas.setAttribute("aria-label", `${descriptor.name}の360度3Dモデル`);
  document.title = `${descriptor.name} ${catalog.label}360°開発`;
  document.documentElement.style.setProperty("--character-color", descriptor.bodyColorCss);
  primaryToggleLabel.textContent = model.userData.primaryDecorationLabel;
  secondaryToggleLabel.textContent = model.userData.secondaryDecorationLabel;
  showCape.checked = true;
  showCape.disabled = !model.userData.primaryDecoration;
  showCord.checked = true;
  showCord.disabled = !model.userData.secondaryDecoration;
  primaryToggleRow.hidden = !model.userData.primaryDecoration;
  secondaryToggleRow.hidden = !model.userData.secondaryDecoration;
  bodyCheckText.textContent = `${descriptor.name}固有の輪郭を、継ぎ目のない立体胴体として再現`;
  if (state.growthStage === "flowering") {
    decorCheckText.textContent = "王冠・流星翼・マントなど満開期専用装飾を付けない開花期の姿";
    rearCheckText.textContent = "頭部・胴体・手足は側面と背面まで連続する共通360度立体構造";
  } else {
    decorCheckText.textContent = `${descriptor.decorationLabel}を平面ではなく厚みのある立体構造で再現`;
    rearCheckText.textContent = descriptor.decoration === "forest"
      ? "マントと紐は側面・背面まで連続して接続"
      : descriptor.decoration === "comet"
        ? "左右の翼は背中の付け根から先端まで立体接続"
        : "王冠は後頭部側まで一周する立体構造";
  }
  [...familyFilterList.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.familyKey === descriptor.familyKey);
  });
  renderQuickList(descriptor.familyKey);
}

function updateCharacterUrl(characterId) {
  const url = new URL(window.location.href);
  url.searchParams.set("stage", state.growthStage);
  url.searchParams.set("character", characterId);
  window.history.replaceState(null, "", url);
}

function selectCharacter(characterId, { updateUrl = true } = {}) {
  const catalog = currentCatalog();
  const descriptor = catalog.roster.find((item) => item.id === characterId);
  if (!descriptor || !scene) return false;
  if (model) {
    scene.remove(model);
    disposeMatureCharacterModel(model);
  }
  state.characterId = descriptor.id;
  model = catalog.buildModel(descriptor.id, { castShadow: true });
  scene.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const boundsSize = bounds.getSize(new THREE.Vector3());
  const boundsCenter = bounds.getCenter(new THREE.Vector3());
  model.userData.cameraTargetY = boundsCenter.y;
  model.userData.cameraDistanceScale = Math.max(
    model.userData.cameraDistanceScale || 1,
    boundsSize.x / 105,
    boundsSize.y / 84,
    boundsSize.z / 92
  );
  setMatureCharacterModelWireframe(model, wireframe.checked);
  updateCharacterControls(descriptor);
  updateView();
  if (updateUrl) updateCharacterUrl(descriptor.id);
  return true;
}

function renderQuickList(familyKey) {
  characterQuickList.replaceChildren();
  const catalog = currentCatalog();
  const familyItems = catalog.roster.filter((item) => item.familyKey === familyKey);
  familyItems.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.characterId = item.id;
    button.title = `${index + 1}. ${item.name}${item.decoration ? ` / ${item.decorationLabel}` : ""}`;
    button.textContent = `${index + 1}. ${item.name}`;
    button.style.setProperty("--family-color", item.bodyColorCss);
    button.classList.toggle("is-active", item.id === state.characterId);
    button.addEventListener("click", () => selectCharacter(item.id));
    characterQuickList.append(button);
  });
  const family = catalog.families.find((item) => item.key === familyKey);
  characterQuickList.setAttribute("aria-label", `${family?.label || "選択中"}の${catalog.label}${familyItems.length}種を直接選択`);
}

function selectFamily(familyKey) {
  const current = currentDescriptor();
  const familyItems = currentRoster().filter((item) => item.familyKey === familyKey);
  const matchingVariant = familyItems.find((item) =>
    item.formKey === current.formKey
      && (state.growthStage === "flowering" || item.decoration === current.decoration)
  );
  selectCharacter(matchingVariant?.id || familyItems[0]?.id);
}

function buildCharacterRoster() {
  const catalog = currentCatalog();
  characterSelect.replaceChildren();
  familyFilterList.replaceChildren();
  catalog.families.forEach((family) => {
    const items = catalog.roster.filter((item) => item.familyKey === family.key);
    const group = document.createElement("optgroup");
    group.label = `${family.label}（${items.length}種）`;
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.decoration ? `${item.name}（${item.decorationLabel}）` : item.name;
      group.append(option);
    });
    characterSelect.append(group);

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.familyKey = family.key;
    button.style.setProperty("--family-color", family.bodyColorCss);
    const swatch = document.createElement("span");
    swatch.className = "family-swatch";
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = family.label;
    button.append(swatch, label);
    button.addEventListener("click", () => selectFamily(family.key));
    familyFilterList.append(button);
  });
  renderQuickList(currentDescriptor().familyKey);
}

function updateGrowthStageCopy() {
  const catalog = currentCatalog();
  const total = catalog.roster.length;
  growthStageTitleText.textContent = `${catalog.label}全${total}種 360°開発`;
  growthStageLead.textContent = catalog.lead;
  rosterEyebrow.textContent = catalog.rosterEyebrow;
  characterSelect.setAttribute("aria-label", `${catalog.label}キャラクターを選択`);
  document.body.dataset.growthStage = catalog.key;
  [...growthStageTabs.querySelectorAll("[data-growth-stage]")].forEach((button) => {
    const active = button.dataset.growthStage === catalog.key;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setGrowthStage(nextStageKey, { updateUrl = true, characterId = null } = {}) {
  const nextCatalog = CATALOGS[nextStageKey];
  if (!nextCatalog) return false;
  const previous = currentDescriptor();
  state.growthStage = nextCatalog.key;
  const requested = characterId && nextCatalog.roster.find((item) => item.id === characterId);
  const matchingForm = nextCatalog.roster.find((item) =>
    item.familyKey === previous.familyKey
      && item.formKey === previous.formKey
      && (nextCatalog.key === "flowering" || item.decoration === previous.decoration)
  );
  const matchingForest = nextCatalog.roster.find((item) =>
    item.familyKey === previous.familyKey
      && item.formKey === previous.formKey
      && item.decoration === "forest"
  );
  state.characterId = requested?.id
    || matchingForm?.id
    || matchingForest?.id
    || nextCatalog.defaultCharacterId;
  updateGrowthStageCopy();
  buildCharacterRoster();
  if (scene) return selectCharacter(state.characterId, { updateUrl });
  if (updateUrl) updateCharacterUrl(state.characterId);
  return true;
}

function selectCharacterAcrossStages(characterId, { updateUrl = true } = {}) {
  const targetStage = Object.values(CATALOGS).find((catalog) =>
    catalog.roster.some((item) => item.id === characterId)
  )?.key;
  if (!targetStage) return false;
  if (targetStage !== state.growthStage) {
    return setGrowthStage(targetStage, { updateUrl, characterId });
  }
  return selectCharacter(characterId, { updateUrl });
}

function summarizeCurrentModel() {
  if (!model) return null;
  let meshes = 0;
  let vertices = 0;
  model.traverse((object) => {
    if (!object.isMesh) return;
    meshes += 1;
    vertices += object.geometry?.getAttribute?.("position")?.count || 0;
  });
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  return {
    id: model.userData.sourceCharacterId,
    name: model.userData.characterName,
    familyKey: model.userData.familyKey,
    familyLabel: model.userData.familyLabel,
    bodyColor: `#${model.userData.materials.body.color.getHexString()}`,
    templateCharacterId: model.userData.templateCharacterId,
    profileKey: model.userData.profileKey,
    decorationType: model.userData.decorationType,
    meshes,
    vertices,
    bounds: { x: size.x, y: size.y, z: size.z }
  };
}

function initialize() {
  try {
    updateGrowthStageCopy();
    buildCharacterRoster();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07131f, .0024);
    camera = new THREE.PerspectiveCamera(31, 1, .1, 1000);

    buildLighting();
    buildPedestal();
    selectCharacter(initialCharacterId, { updateUrl: false });

    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(stage);
    resizeRenderer();
    updateView();
    animationFrameId = requestAnimationFrame(render);
  } catch (error) {
    console.error("360°キャラクター開発ページの初期化に失敗しました。", error);
    stage.classList.add("has-error");
    document.getElementById("dragGuide").textContent = "3D表示を初期化できませんでした。ページを更新してください。";
  }
}

function render() {
  if (autoRotate.checked && !state.dragging) {
    state.yaw = normalizeYaw(state.yaw + .18);
    updateView();
  }
  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(render);
}

function beginDrag(event) {
  if (!model) return;
  state.dragging = true;
  state.pointerId = event.pointerId;
  state.previousX = event.clientX;
  state.previousY = event.clientY;
  stage.classList.add("is-dragging");
  stage.setPointerCapture?.(event.pointerId);
  event.preventDefault();
}

function moveDrag(event) {
  if (!state.dragging || event.pointerId !== state.pointerId) return;
  const deltaX = event.clientX - state.previousX;
  const deltaY = event.clientY - state.previousY;
  state.previousX = event.clientX;
  state.previousY = event.clientY;
  state.yaw = normalizeYaw(state.yaw + deltaX * .48);
  state.pitch = THREE.MathUtils.clamp(state.pitch - deltaY * .24, -30, 30);
  updateView();
  event.preventDefault();
}

function endDrag(event) {
  if (!state.dragging || event.pointerId !== state.pointerId) return;
  state.dragging = false;
  state.pointerId = null;
  stage.classList.remove("is-dragging");
  try { stage.releasePointerCapture?.(event.pointerId); } catch {}
}

function stepCharacter(direction) {
  const roster = currentRoster();
  const currentIndex = Math.max(0, roster.findIndex((item) => item.id === state.characterId));
  const nextIndex = (currentIndex + direction + roster.length) % roster.length;
  selectCharacter(roster[nextIndex].id);
}

stage.addEventListener("pointerdown", beginDrag, { passive: false });
stage.addEventListener("pointermove", moveDrag, { passive: false });
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

yawRange.addEventListener("input", () => {
  state.yaw = Number(yawRange.value);
  updateView();
});
pitchRange.addEventListener("input", () => {
  state.pitch = Number(pitchRange.value);
  updateView();
});
zoomRange.addEventListener("input", () => {
  state.zoom = Number(zoomRange.value);
  updateView();
});

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.yaw = Number(button.dataset.yaw);
    updateView();
  });
});

[...growthStageTabs.querySelectorAll("[data-growth-stage]")].forEach((button) => {
  button.addEventListener("click", () => setGrowthStage(button.dataset.growthStage));
});

characterSelect.addEventListener("change", () => selectCharacter(characterSelect.value));
previousCharacter.addEventListener("click", () => stepCharacter(-1));
nextCharacter.addEventListener("click", () => stepCharacter(1));
wireframe.addEventListener("change", () => setMatureCharacterModelWireframe(model, wireframe.checked));
showCape.addEventListener("change", () => {
  if (model?.userData?.primaryDecoration) model.userData.primaryDecoration.visible = showCape.checked;
});
showCord.addEventListener("change", () => {
  if (model?.userData?.secondaryDecoration) model.userData.secondaryDecoration.visible = showCord.checked;
});

resetView.addEventListener("click", () => {
  state.yaw = 0;
  state.pitch = 0;
  state.zoom = 100;
  autoRotate.checked = false;
  updateView();
});

saveImage.addEventListener("click", () => {
  if (!renderer) return;
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = `${state.characterId}-${Math.round(normalizeYaw(state.yaw))}deg.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});

window.imasoraCharacter360Dev = {
  get roster() { return currentRoster().map((item) => ({ ...item })); },
  get families() { return currentCatalog().families.map((item) => ({ ...item })); },
  get growthStage() { return state.growthStage; },
  selectCharacter,
  selectCharacterAcrossStages,
  setGrowthStage,
  getSummary: summarizeCurrentModel,
  setDirection(yaw, pitch = state.pitch) {
    state.yaw = normalizeYaw(Number(yaw) || 0);
    state.pitch = THREE.MathUtils.clamp(Number(pitch) || 0, -30, 30);
    updateView();
  }
};

window.addEventListener("imasora-character-360-select-request", (event) => {
  const characterId = event.detail?.characterId;
  const selected = selectCharacterAcrossStages(characterId, { updateUrl: false });
  window.dispatchEvent(new CustomEvent("imasora-character-360-select-result", {
    detail: { requestId: event.detail?.requestId, selected, summary: summarizeCurrentModel() }
  }));
});

window.addEventListener("beforeunload", () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  resizeObserver?.disconnect();
  if (model) disposeMatureCharacterModel(model);
  renderer?.dispose();
}, { once: true });

initialize();
