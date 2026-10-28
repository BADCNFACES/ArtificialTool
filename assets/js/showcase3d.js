/* Artificial Tool — 3B vitrin (three r128 + glb-mini.js).
   ATShow.create(host, {mode:"hero"|"show"}) → { show(name), kit(name), zoom(d), ready } */
(function (g) {
  "use strict";
  const BASE = "assets/models/";
  // önbellek kırıcı: model dosyaları aynı adla güncellenince tarayıcı eskisini kullanmasın
  const VER = "6";
  const U = (f) => BASE + f + "?v=" + VER;
  const MODELS = {
    player:  { file: "player.glb", kind: "player" },
    ball:    { file: "ball.glb", kind: "prop", size: 0.22 },
    classic: { file: "ball_classic.glb", kind: "prop", size: 0.22 },
    b0: { file: "ball_0.glb", kind: "prop" }, b6: { file: "ball_6.glb", kind: "prop" },
    b10: { file: "ball_10.glb", kind: "prop" }, b12: { file: "ball_12.glb", kind: "prop" },
    b18: { file: "ball_18.glb", kind: "prop" },
    face:    { file: "player.glb", kind: "face" },
    trophy:  { file: "trophy.glb", kind: "trophy" },
    t1507: { file: "trophy_1507.glb", kind: "trophy" }, t846: { file: "trophy_846.glb", kind: "trophy" },
    t840: { file: "trophy_840.glb", kind: "trophy" }, t981: { file: "trophy_981.glb", kind: "trophy" },
    stadium: { file: "stadium.glb", kind: "stadium" },
    s_bl: { file: "stadium_generic_british_large.glb", kind: "stadium" },
    s_eo: { file: "stadium_generic_eastern_olympic_large.glb", kind: "stadium" },
    s_mm: { file: "stadium_generic_modern_medium.glb", kind: "stadium" },
    s_sa: { file: "stadium_generic_south_american.glb", kind: "stadium" },
  };
  // görünüm seçenekleri (oyunun jenerik yüzleri, saçları, sakalları, ten tonları)
  const TONES = { 2: 21, 4: 41, 7: 71, 9: 91 };       // gövde ten no → Cranium ten kodu
  const HAIRLINE = ["1", "104", "105", "110", "1065", "1080", "1090"];   // saç dibi dokusu olanlar
  const DEFAULT_LOOK = { face: "1007", tone: 4, hair: "1065", hairColor: "#1c1510", beard: "0" };
  function loadGLB(file) {
    if (!cache[file]) cache[file] = ATGLB.loadGLB(U(file));
    return cache[file];
  }
  async function cloneGLB(file) {
    const src = await loadGLB(file), o = src.clone(true);
    // Material.clone() userData'yı JSON ile kopyalar: içindeki dokular
    // (saç kıl / örtü haritaları) kaybolur — kaynağınkini paylaş
    const sm = [];
    src.traverse((m) => { if (m.isMesh) sm.push(m.material); });
    let i = 0;
    o.traverse((m) => {
      if (!m.isMesh) return;
      const s0 = sm[i++] || m.material;
      m.material = s0.clone(); m.material.userData = s0.userData;
    });
    return o;
  }
  function loadAlpha(url) {
    if (texCache[url]) return texCache[url];
    texCache[url] = new Promise((ok) => new THREE.TextureLoader().load(url, (t) => { t.flipY = false; ok(t); }, undefined, () => ok(null)));
    return texCache[url];
  }
  const KITS = ["home", "away", "third"];
  const cache = {};
  const texCache = {};

  function webgl() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) { return false; }
  }

  function envMap(renderer) {
    const pm = new THREE.PMREMGenerator(renderer);
    const s = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide }));
    s.add(room);
    const panel = (w, h, col, p, r) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      m.position.set(p[0], p[1], p[2]); m.rotation.set(r[0], r[1], r[2]); s.add(m);
    };
    panel(5, 2.2, 0xfff1f8, [0, 4.8, 0], [Math.PI / 2, 0, 0]);       // tavan softbox
    panel(2.2, 5, 0xf3d9e6, [-4.9, 1, 1], [0, Math.PI / 2, 0]);      // gül
    panel(2.2, 5, 0xd9d9f0, [4.9, 1, -1], [0, -Math.PI / 2, 0]);     // lavanta
    panel(6, 1.2, 0x5a3a52, [0, -1, -4.9], [0, 0, 0]);
    const t = pm.fromScene(s, 0.035).texture;
    pm.dispose();
    return t;
  }

  function glowTex(inner, outer) {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const x = c.getContext("2d"), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); return t;
  }

  function pitchTex() {
    const W = 1050, H = 680, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d");
    for (let i = 0; i < 14; i++) { x.fillStyle = i % 2 ? "#2f5a2a" : "#356630"; x.fillRect(i * W / 14, 0, W / 14 + 1, H); }
    x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 3;
    const m = 10, r = (a, b, w, h) => x.strokeRect(a, b, w, h);
    r(m, m, W - 2 * m, H - 2 * m);
    x.beginPath(); x.moveTo(W / 2, m); x.lineTo(W / 2, H - m); x.stroke();
    x.beginPath(); x.arc(W / 2, H / 2, 91.5, 0, Math.PI * 2); x.stroke();
    r(m, H / 2 - 201.5, 165, 403); r(W - m - 165, H / 2 - 201.5, 165, 403);
    r(m, H / 2 - 91.5, 55, 183); r(W - m - 55, H / 2 - 91.5, 55, 183);
    x.fillStyle = "#fff";
    [[W / 2, H / 2], [m + 110, H / 2], [W - m - 110, H / 2]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 4, 0, 7); x.fill(); });
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }

  function loadTex(url) {
    if (texCache[url]) return texCache[url];
    texCache[url] = new Promise((ok, err) => new THREE.TextureLoader().load(url, (t) => {
      t.flipY = false; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; ok(t);
    }, undefined, err));
    return texCache[url];
  }

  function getModel(name, onProgress) {
    const f = MODELS[name].file;
    if (!cache[f]) cache[f] = ATGLB.loadGLB(U(f), onProgress);
    return cache[f];
  }

  function create(host, opts) {
    opts = opts || {};
    const hero = opts.mode === "hero";
    if (!webgl() || !window.THREE || !window.ATGLB) {
      host.classList.add("no3d");
      return { show() {}, kit() {}, zoom() {}, ready: Promise.resolve(false) };
    }
    const canvas = document.createElement("canvas");
    canvas.className = "s3d-canvas";
    host.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hero ? 1.75 : 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.environment = envMap(renderer);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 2000);
    const controls = new THREE.OrbitControls(cam, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false; controls.enableZoom = false;
    controls.rotateSpeed = 0.6;
    controls.autoRotate = true; controls.autoRotateSpeed = hero ? 0.9 : 1.2;

    // ışıklar
    scene.add(new THREE.HemisphereLight(0xfff4f8, 0x1a1418, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(2.5, 4, 4); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45); fill.position.set(-3, 1.5, 3); scene.add(fill);
    const rimR = new THREE.DirectionalLight(0xf6cfe2, 1.25); rimR.position.set(-4, 2.5, -3); scene.add(rimR);
    const rimL = new THREE.DirectionalLight(0xcfcfee, 1.0); rimL.position.set(4, 2, -3.5); scene.add(rimL);

    // sahne zemini: parlayan halka + gölge
    const stage = new THREE.Group(); scene.add(stage);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 128),
      new THREE.MeshBasicMaterial({ color: 0xffd3ea, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; stage.add(ring);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 64),
      new THREE.MeshBasicMaterial({ map: glowTex("rgba(0,0,0,.7)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; stage.add(shadow);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.98, 96),
      new THREE.MeshStandardMaterial({ color: 0x120c16, metalness: 0.2, roughness: 0.55, transparent: true, opacity: 0.7, envMapIntensity: 0.35 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.001; stage.add(disc);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: glowTex("rgba(242,167,200,.55)", "rgba(242,167,200,0)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.003; stage.add(glow);

    // kupa / top kaidesi
    const ped = new THREE.Group();
    const pedBody = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, 1, 64),
      new THREE.MeshStandardMaterial({ color: 0x141218, metalness: 0.25, roughness: 0.55, envMapIntensity: 0.5 }));
    const pedRim = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.018, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0xdca6c6, metalness: 0.9, roughness: 0.25, emissive: 0x40182f }));
    pedRim.rotation.x = Math.PI / 2;
    ped.add(pedBody, pedRim); scene.add(ped); ped.visible = false;

    let current = null, curName = "", kitName = "home", homeMaps = null, spinObj = null;
    const LOOK = Object.assign({}, DEFAULT_LOOK, opts.look || {});
    async function applyLook(obj) {
      const gen = obj.userData.lookGen = (obj.userData.lookGen || 0) + 1, L = Object.assign({}, LOOK);
      const old = obj.getObjectByName("__look");
      const grp = new THREE.Group(); grp.name = "__look";
      const head = await cloneGLB("head_" + L.face + ".glb");
      const htex = await loadTex(U("headtex_" + L.face + "_" + TONES[L.tone] + ".jpg")).catch(() => null);
      let headMesh = null;
      head.traverse((m) => { if (m.isMesh && m.material.name === "head") { headMesh = m; if (htex) { m.material.map = htex; m.material.needsUpdate = true; } } });
      grp.add(head);
      const tint = new THREE.Color(L.hairColor).convertSRGBToLinear();
      // saç / sakal kartları: parlama yok (eğik kartlarda ışık rengi baskın çıkıyordu)
      // saç / sakal kartları — uygulamadaki gibi: renk = seçilen ton × kıl
      // ayrıntısı (renk dokusunun G kanalı, 1. UV); örtü coeff dokusundan
      // (kartlar G / 2. UV, başlık R). Parlama yok, tuvalde yarı saydam kalmaz.
      const matte = (m) => {
        const o = m.material, u = o.userData || {};
        const mat = new THREE.MeshLambertMaterial({ color: tint, side: THREE.DoubleSide, name: o.name });
        if (u.detailMap && u.coeffMap) {
          mat.onBeforeCompile = (sh) => {
            sh.uniforms.detailMap = { value: u.detailMap };
            sh.uniforms.coeffMap = { value: u.coeffMap };
            sh.uniforms.gmean = { value: u.gmean || 0.5 };
            sh.uniforms.chan = { value: u.ch || 0 };
            sh.uniforms.cut = { value: u.cut || 0.2 };
            sh.vertexShader = "attribute vec2 uvc;\nvarying vec2 vUvA;\nvarying vec2 vUvC;\n" +
              sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvUvA = uv; vUvC = uvc;");
            sh.fragmentShader = "uniform sampler2D detailMap;\nuniform sampler2D coeffMap;\nuniform float gmean;\nuniform float chan;\nuniform float cut;\nvarying vec2 vUvA;\nvarying vec2 vUvC;\n" +
              sh.fragmentShader.replace("#include <map_fragment>", [
                "vec4 co_ = texture2D(coeffMap, vUvC);",
                "float a_ = chan < 0.5 ? co_.r : co_.g;",
                "if (a_ < cut) discard;",
                "float g_ = texture2D(detailMap, vUvA).g;",
                "float v_ = clamp(0.25 + pow(g_ / max(gmean, 0.05), 1.5), 0.15, 2.6);",
                "float c_ = 0.4 + 0.8 * pow(clamp(a_, 0.0, 1.0), 0.7);",
                "diffuseColor.rgb = max(diffuse, vec3(0.022)) * v_ * c_;",
                "diffuseColor.a = 1.0;"].join("\n"));
          };
          mat.customProgramCacheKey = () => "hair2";
        }
        m.material = mat;
      };
      if (L.hair && L.hair !== "0") {
        const hair = await cloneGLB("hair_" + L.hair + ".glb").catch(() => null);
        if (hair) { hair.traverse((m) => { if (m.isMesh) matte(m); }); grp.add(hair); }
        const hl = HAIRLINE.includes(L.hair) ? await loadAlpha(U("hairline_" + L.hair + ".png")) : null;
        if (hl && headMesh) {
          const ov = new THREE.Mesh(headMesh.geometry, new THREE.MeshLambertMaterial({
            color: tint, map: hl, transparent: true, depthWrite: false,
            polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
          ov.renderOrder = 1; headMesh.parent.add(ov);
        }
      }
      if (L.beard && L.beard !== "0") {
        const b = await cloneGLB("beard_" + L.beard + ".glb").catch(() => null);
        if (b) { b.traverse((m) => { if (m.isMesh) matte(m); }); grp.add(b); }
      }
      const [su, sl] = await Promise.all([loadTex(U("skin_" + L.tone + "_upper.jpg")), loadTex(U("skin_" + L.tone + "_lower.jpg"))]).catch(() => [null, null]);
      if (gen !== obj.userData.lookGen) return;
      obj.traverse((m) => {
        if (!m.isMesh) return;
        if (m.material.name === "skin_upper" && su) { m.material.map = su; m.material.needsUpdate = true; }
        if (m.material.name === "skin_lower" && sl) { m.material.map = sl; m.material.needsUpdate = true; }
      });
      if (old) obj.remove(old);
      obj.add(grp);
      wake();
    }
    async function look(part) {
      Object.assign(LOOK, part || {});
      const jobs = [];
      for (const k of ["player", "face"]) if (objs[k]) jobs.push(applyLook(objs[k]));
      await Promise.all(jobs);
    }
    const objs = {};
    let pitch = null;
    const holder = new THREE.Group(); scene.add(holder);

    function frame(name, obj) {
      const k = MODELS[name].kind;
      if (pitch && pitch.parent) pitch.parent.remove(pitch);
      obj.position.set(0, 0, 0); obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      ped.visible = false; stage.visible = true; spinObj = null;
      controls.minPolarAngle = 0.35; controls.maxPolarAngle = Math.PI / 2 - 0.02;
      if (k === "player") {
        obj.position.set(-c.x, -box.min.y, -c.z);
        stage.scale.setScalar(0.62); ring.visible = true;
        const h = size.y;
        controls.target.set(0, h * (hero ? 0.56 : 0.52), 0);
        cam.position.set(0, h * 0.62, h * (hero ? 2.55 : 2.9));
        cam.fov = 30;
        controls.minPolarAngle = 1.1; controls.maxPolarAngle = 1.75;
      } else if (k === "face") {
        obj.position.set(-c.x, -box.min.y, -c.z);
        stage.scale.setScalar(0.62); ring.visible = true;
        const h = size.y;
        controls.target.set(0, h * 0.915, 0.02);
        cam.position.set(0.14, h * 0.93, 1.0);
        cam.fov = 28;
        controls.minPolarAngle = 1.2; controls.maxPolarAngle = 1.85;
      } else if (k === "prop") {
        const ph = 0.09; ped.visible = true; ped.scale.set(0.13, ph, 0.13); ped.position.y = ph / 2;
        obj.position.set(-c.x, ph - box.min.y + 0.004, -c.z);
        stage.scale.setScalar(0.26); spinObj = obj;
        controls.target.set(0, ph + size.y * 0.42, 0);
        cam.position.set(0, ph + size.y * 1.35, size.y * 6.4);
        cam.fov = 30;
      } else if (k === "trophy") {
        const ph = 0.08; ped.visible = true; ped.scale.set(0.27, ph, 0.27); ped.position.y = ph / 2;
        obj.position.set(-c.x, ph - box.min.y, -c.z);
        stage.scale.setScalar(0.4);
        controls.target.set(0, ph + size.y * 0.45, 0);
        cam.position.set(0, ph + size.y * 1.0, size.y * 4.8);
        cam.fov = 30;
      } else if (k === "stadium") {
        obj.position.set(-c.x, -box.min.y, -c.z);
        if (!obj.userData.toned) {
          obj.userData.toned = true;
          obj.traverse((m) => { if (m.isMesh && m.material !== (pitch && pitch.material)) { m.material.envMapIntensity = 0.3; m.material.color.multiplyScalar(0.55); } });
        }
        stage.visible = false;
        if (!pitch) {
          pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68),
            new THREE.MeshStandardMaterial({ map: pitchTex(), roughness: 0.9, metalness: 0 }));
          pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.06;
        }
        // saha yüzeyinin yüksekliği: ortadan aşağı ışın (çatı / tribün atlanır)
        obj.updateMatrixWorld(true);
        const rc = new THREE.Raycaster(new THREE.Vector3(0, size.y + 10, 0), new THREE.Vector3(0, -1, 0));
        const hits = rc.intersectObject(obj, true).filter((h) => h.point.y < 5);
        const gy = hits.length ? hits[0].point.y : 0;
        obj.add(pitch); pitch.position.set(c.x, gy - obj.position.y + 0.05, c.z);
        const R = Math.max(size.x, size.z);
        controls.target.set(0, 0, 0);
        cam.position.set(R * 0.85, R * 0.6, R * 1.05);
        cam.fov = 34;
        controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.38;
      }
      if (k !== "player" && k !== "face" && cam.aspect < 1) {
        const off = cam.position.clone().sub(controls.target).multiplyScalar(Math.min(1.9, 0.85 / cam.aspect));
        cam.position.copy(controls.target).add(off);
      }
      cam.near = Math.max(0.01, cam.position.length() / 400); cam.far = cam.position.length() * 20;
      cam.updateProjectionMatrix();
      controls.update();
      baseDist = cam.position.distanceTo(controls.target);
    }
    let baseDist = 1;

    function setProgress(p) { host.style.setProperty("--load", Math.round(p * 100) + "%"); }

    async function show(name) {
      if (name === curName) return;
      curName = name;
      host.classList.add("loading"); setProgress(0);
      let obj;
      try {
        if (!objs[name]) {
          const src = await getModel(name, setProgress);
          objs[name] = src.clone(true);
          if (["player", "face"].includes(MODELS[name].kind)) {
            for (const c of [...objs[name].children]) if (["head", "hair", "haircap", "neck"].includes(c.name)) objs[name].remove(c);
          }
          objs[name].traverse((m) => { if (m.isMesh) m.material = m.material.clone(); });
        }
        obj = objs[name];
      }
      catch (e) { console.warn(e); host.classList.remove("loading"); host.classList.add("err"); return; }
      if (name !== curName) return;
      if (current) holder.remove(current);
      current = obj; holder.add(obj);
      if (["player", "face"].includes(MODELS[name].kind) && !obj.userData.homeMaps) {
        obj.userData.homeMaps = {};
        obj.traverse((m) => { if (m.isMesh && ["jersey", "shorts", "socks"].includes(m.name)) obj.userData.homeMaps[m.name] = m.material.map; });
      }
      homeMaps = obj.userData.homeMaps || null;
      if (homeMaps && !obj.getObjectByName("__look")) await applyLook(obj).catch((e) => console.warn(e));
      if (name !== curName) return;
      frame(name, obj);
      if (homeMaps) kit(kitName);
      host.classList.remove("loading", "err");
      host.dataset.model = name;
      wake();
    }

    async function kit(name) {
      kitName = name;
      if (!current || !homeMaps) return;
      const parts = [];
      current.traverse((m) => { if (m.isMesh && homeMaps && homeMaps[m.name]) parts.push(m); });
      for (const m of parts) {
        const t = name === "home" ? homeMaps[m.name] : await loadTex(U("kit_" + name + "_" + m.name + ".jpg"));
        if (kitName !== name) return;
        m.material.map = t; m.material.needsUpdate = true;
      }
      wake();
    }

    function zoom(d) {
      const dir = cam.position.clone().sub(controls.target);
      const L = THREE.MathUtils.clamp(dir.length() * (d > 0 ? 0.85 : 1.18), baseDist * 0.35, baseDist * 1.6);
      cam.position.copy(controls.target).add(dir.setLength(L));
      controls.update(); wake();
    }

    // boyut / görünürlük
    function resize() {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); wake();
    }
    let visible = true, running = false, idleUntil = 0;
    const clock = new THREE.Clock();
    new ResizeObserver(resize).observe(host); resize();
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) wake(); }, { threshold: 0.01 }).observe(host);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) controls.autoRotate = false;
    let userTimer = null;
    controls.addEventListener("start", () => { controls.autoRotate = false; host.classList.add("grab"); clearTimeout(userTimer); wake(); });
    controls.addEventListener("end", () => { host.classList.remove("grab"); userTimer = setTimeout(() => { if (!reduce) controls.autoRotate = true; wake(); }, 4000); });
    controls.addEventListener("change", wake);

    function wake() { idleUntil = performance.now() + 600; if (!running && visible && !document.hidden) { running = true; clock.getDelta(); requestAnimationFrame(loop); } }
    function loop() {
      const dt = Math.min(clock.getDelta(), 0.05), t = performance.now();
      controls.update();
      if (spinObj && !reduce) spinObj.rotation.y += dt * 0.6;
      const pulse = 0.75 + Math.sin(t / 900) * 0.15;
      ring.material.opacity = pulse; glow.scale.setScalar(2.7 + Math.sin(t / 900) * 0.08);
      renderer.render(scene, cam);
      const anim = controls.autoRotate || spinObj || t < idleUntil;
      if (visible && !document.hidden && anim) requestAnimationFrame(loop); else running = false;
    }
    host.addEventListener("pointerdown", wake);

    const ready = show(opts.model || "player").then(() => true);
    return { show, kit, zoom, look, ready, kits: KITS, getLook: () => Object.assign({}, LOOK) };
  }

  g.ATShow = { create, webgl };
})(window);
