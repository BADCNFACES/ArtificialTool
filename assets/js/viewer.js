/* Artificial Tool — 3D vitrin (three.js + FBXLoader). Modeller config.js → SITE.models */
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

window.__at3d = true;
const S = window.SITE || {};
const T = k => (window.T ? window.T(k) : k);
const box = document.getElementById("viewer");
const stateEl = document.getElementById("v-state");
const varEl = document.getElementById("v-variants");
const titleEl = document.getElementById("v-title");
const subEl = document.getElementById("v-sub");

let renderer, scene, camera, controls, root, visible = true;
let tab = "player", vi = 0, token = 0;
const cache = new Map();     // fbx yolu → Promise<Group>
const texLoader = new THREE.TextureLoader();
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

function setState(kind, text) {
  stateEl.style.display = kind ? "grid" : "none";
  if (!kind) return;
  if (kind === "loading") {
    stateEl.innerHTML = `<div><b>${T("v.loading")}</b><div class="bar"><i id="v-bar"></i></div></div>`;
  } else {
    stateEl.innerHTML = `<div><b>${text || T("v.empty")}</b><span>${T(kind === "error" ? "v.error" : "v.emptySub")}</span></div>`;
  }
}

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  box.prepend(renderer.domElement);
  scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 5000);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  // ışıklar: lila anahtar, gül kenar
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); key.castShadow = true;
  const rim = new THREE.DirectionalLight(0xd8a6b8, 2.4); rim.position.set(-3, 2, -3);
  const fill = new THREE.DirectionalLight(0xa9a8e0, 0.9); fill.position.set(-2, 1, 3);
  scene.add(key, rim, fill, new THREE.AmbientLight(0xffffff, 0.25));
  // zemin gölgesi
  const g = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.name = "ground";
  scene.add(g);
  root = new THREE.Group();
  scene.add(root);
  new ResizeObserver(resize).observe(box);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  resize();
  renderer.setAnimationLoop(() => { if (!visible) return; controls.update(); renderer.render(scene, camera); });
}

function resize() {
  const w = box.clientWidth, h = box.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

function loadFbx(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((ok, no) => fbxLoader.load(url, ok, ev => {
      const b = document.getElementById("v-bar");
      if (ev.lengthComputable && b) b.style.width = (ev.loaded / ev.total * 100) + "%";
    }, no)));
  }
  return cache.get(url).then(g => g.clone(true));
}

// doku yalnız yüklenince bağlanır (eksik dosya modeli siyaha boyamasın)
function tex(m, slot, url, srgb) {
  texLoader.load(url, t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    m[slot] = t;
    if (slot === "map") m.color.set(0xffffff);
    m.needsUpdate = true;
  }, undefined, () => console.warn("3D doku yok:", url));
}

function material(part) {
  if (!part.texture && !part.color && !part.normal) return null;
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(part.color || "#bbbbbb"),
    roughness: part.roughness ?? 0.62, metalness: part.metalness ?? 0.0,
  });
  if (part.texture) tex(m, "map", part.texture, true);
  if (part.normal) tex(m, "normalMap", part.normal, false);
  if (part.alpha) { m.transparent = true; m.alphaTest = 0.35; m.side = THREE.DoubleSide; m.depthWrite = true; }
  return m;
}

function fit(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z) || 1;
  obj.position.sub(c);                         // merkeze al
  obj.position.y += size.y / 2;                // tabanı zemine koy
  const ground = scene.getObjectByName("ground");
  ground.scale.setScalar(r * 0.75);
  const dist = r / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.25;
  camera.near = r / 200; camera.far = r * 50; camera.updateProjectionMatrix();
  controls.target.set(0, size.y / 2, 0);
  camera.position.set(dist * 0.55, size.y * 0.62, dist * 0.85);
  controls.minDistance = r * 0.6; controls.maxDistance = r * 4;
  controls.update();
}

// -- model.json + model.glb (Site Modelleri Hazırla aracının çıktısı) -------------------
const glbCache = new Map();
function loadGlb(url) {
  if (!glbCache.has(url)) {
    glbCache.set(url, new Promise((ok, no) => gltfLoader.load(url, g => ok(g.scene), ev => {
      const b = document.getElementById("v-bar");
      if (ev.lengthComputable && b) b.style.width = (ev.loaded / ev.total * 100) + "%";
    }, no)));
  }
  return glbCache.get(url).then(g => g.clone(true));
}
function partMaterial(spec, base) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color || "#cccccc"),
    roughness: spec.roughness ?? 0.6, metalness: spec.metalness ?? 0,
    side: spec.side === "double" ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (spec.map) tex(m, "map", base + spec.map, true);
  if (spec.alphaMap) {
    m.alphaTest = spec.alphaTest ?? 0.3;
    texLoader.load(base + spec.alphaMap, t => { t.channel = spec.alphaUV || 0; m.alphaMap = t; m.needsUpdate = true; });
  }
  return m;
}
async function loadModel(url) {
  const r = await fetch(url);
  if (!r.ok) return null;                       // henüz üretilmemiş → "yakında"
  const spec = await r.json();
  const base = url.slice(0, url.lastIndexOf("/") + 1);
  const scene = await loadGlb(base + (spec.glb || "model.glb"));
  scene.traverse(n => {
    if (!n.isMesh) return;
    const key = n.name || (n.parent && n.parent.name) || "";
    const ps = spec.parts || {};
    const sp = ps[key] || ps[key.replace(/_\d+$/, "")] || {};
    n.material = partMaterial(sp, base);
    n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false;
  });
  return scene;
}

async function show() {
  const my = ++token;
  const cfg = (S.models || {})[tab] || { variants: [] };
  const v = cfg.variants[vi] || { label: "", parts: [] };
  titleEl.textContent = v.label || T("tab." + tab);
  subEl.textContent = T("tab." + tab + "Sub");
  root.clear();
  if (v.model) {
    setState("loading");
    try {
      const obj = await loadModel(v.model);
      if (my !== token) return;
      if (!obj) { setState("empty", T("v.empty")); return; }
      const group = new THREE.Group(); group.add(obj);
      const rot = v.rotate || cfg.rotate;
      if (rot) group.rotation.set(...rot.map(d => THREE.MathUtils.degToRad(d)));
      const wrap = new THREE.Group(); wrap.add(group);
      root.add(wrap); fit(wrap);
      controls.autoRotate = true; setState(null);
    } catch (e) {
      console.warn("3D:", e);
      if (my === token) setState("error", T("v.errorTitle"));
    }
    return;
  }
  let parts = (v.parts || []).filter(p => p && p.fbx);
  if (!parts.length) { setState("empty", T("v.empty")); return; }
  setState("loading");
  // FBX henüz klasöre konmadıysa "yakında" göster (hata değil)
  const have = await Promise.all(parts.map(p => fetch(p.fbx, { method: "HEAD" }).then(r => r.ok || r.status === 405).catch(() => true)));
  if (my !== token) return;
  if (parts.some((p, i) => !have[i] && !p.optional)) { setState("empty", T("v.empty")); return; }
  parts = parts.filter((p, i) => have[i]);
  try {
    const group = new THREE.Group();
    const objs = await Promise.all(parts.map(p => loadFbx(p.fbx).then(o => {
      const m = material(p);
      // oyun modelleri iskeletli gelir; vitrinde duruş gerekmez → düz Mesh (bağlama pozu)
      const skinned = []; o.traverse(n => { if (n.isSkinnedMesh) skinned.push(n); });
      o.updateMatrixWorld(true);
      skinned.forEach(sm => {
        // bağlama pozunu köşelere işle (saç kepi gibi parçalar kemik uzayında gelir)
        const geo = sm.geometry.clone(), pos = geo.attributes.position, v = new THREE.Vector3();
        let moved = 0;
        if (sm.skeleton && geo.attributes.skinIndex) {
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i); const x = v.x, y = v.y, z = v.z;
            sm.applyBoneTransform(i, v);
            if (Math.abs(v.x - x) + Math.abs(v.y - y) + Math.abs(v.z - z) > 1e-4) moved++;
            pos.setXYZ(i, v.x, v.y, v.z);
          }
          if (moved) { geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere(); }
        }
        const mesh = new THREE.Mesh(moved ? geo : sm.geometry, sm.material);
        mesh.name = sm.name; mesh.position.copy(sm.position); mesh.quaternion.copy(sm.quaternion); mesh.scale.copy(sm.scale);
        sm.parent.add(mesh); sm.parent.remove(sm);
      });
      o.traverse(n => {
        if (!n.isMesh) return;
        n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false;
        if (m) n.material = m;
        else (Array.isArray(n.material) ? n.material : [n.material]).forEach(mm => { if (mm) mm.side = THREE.DoubleSide; });
      });
      return o;
    })));
    if (my !== token) return;
    objs.forEach(o => group.add(o));
    const rot = v.rotate || cfg.rotate;
    if (rot) group.rotation.set(...rot.map(d => THREE.MathUtils.degToRad(d)));
    const wrap = new THREE.Group(); wrap.add(group);
    root.add(wrap);
    fit(wrap);
    controls.autoRotate = true;
    setState(null);
  } catch (e) {
    console.warn("3D:", e);
    if (my === token) setState("error", T("v.errorTitle"));
  }
}

function renderVariants() {
  const cfg = (S.models || {})[tab] || { variants: [] };
  varEl.innerHTML = cfg.variants.map((v, i) =>
    `<button type="button" aria-pressed="${i === vi}" data-i="${i}">${v.label}</button>`).join("");
}

document.getElementById("tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  document.querySelectorAll("#tabs [data-tab]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  tab = b.dataset.tab; vi = 0;
  renderVariants(); show();
});
varEl.addEventListener("click", e => {
  const b = e.target.closest("[data-i]"); if (!b) return;
  vi = +b.dataset.i; renderVariants(); show();
});
document.addEventListener("at:lang", () => {
  renderVariants();
  const cfg = (S.models || {})[tab] || { variants: [] }, v = cfg.variants[vi] || {};
  titleEl.textContent = v.label || T("tab." + tab);
  subEl.textContent = T("tab." + tab + "Sub");
  if (stateEl.style.display === "grid") show();
});

// tanı (geliştirme): konsoldan window.__at3dDbg()
window.__at3dDbg = () => {
  const b = new THREE.Box3().setFromObject(root), meshes = [];
  root.traverse(n => { if (n.isMesh) { const mb = new THREE.Box3().setFromObject(n);
    meshes.push([n.name, n.geometry.attributes.position.count, mb.min.toArray().map(Math.round), mb.max.toArray().map(Math.round), n.material.color && n.material.color.getHexString()]); } });
  return { box: [b.min.toArray().map(Math.round), b.max.toArray().map(Math.round)], cam: camera.position.toArray().map(x => +x.toFixed(2)),
    near: camera.near, far: camera.far, canvas: [renderer.domElement.width, renderer.domElement.height], meshes: meshes.slice(0, 6),
    calls: renderer.info.render.calls, tris: renderer.info.render.triangles, visible };
};

try {
  init();
  renderVariants();
  // vitrine yaklaşınca yükle
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); show(); } }, { rootMargin: "300px" }).observe(box);
} catch (e) {
  console.warn("WebGL yok:", e);
  setState("error", T("v.errorTitle"));
}
