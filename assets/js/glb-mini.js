/* Artificial Tool — küçük GLB okuyucu (three r128, global THREE).
   Yalnız sitenin kendi modellerinin kullandığı glTF alt kümesi:
   POSITION / NORMAL / TEXCOORD_0, indeks, PBR malzeme, gömülü dokular. */
(function (g) {
  "use strict";
  const CT = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

  async function loadGLB(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + " " + res.status);
    let buf;
    const total = +res.headers.get("content-length") || 0;
    if (onProgress && res.body && total) {
      const reader = res.body.getReader(); const parts = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); got += value.length; onProgress(got / total);
      }
      const all = new Uint8Array(got); let o = 0;
      for (const p of parts) { all.set(p, o); o += p.length; }
      buf = all.buffer;
    } else {
      buf = await res.arrayBuffer();
    }
    return parseGLB(buf);
  }

  async function parseGLB(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error("not glb");
    const jl = dv.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
    const binOff = 20 + jl + 8;
    const view = (i) => {
      const v = json.bufferViews[i];
      return { off: binOff + (v.byteOffset || 0), len: v.byteLength };
    };
    const acc = (i) => {
      const a = json.accessors[i], v = view(a.bufferView), T = CT[a.componentType];
      return new T(buf.slice(v.off, v.off + a.count * NC[a.type] * T.BYTES_PER_ELEMENT));
    };
    // dokular
    const texCache = {};
    async function texture(i, srgb) {
      const key = i + (srgb ? "s" : "l");
      if (texCache[key]) return texCache[key];
      const t = json.textures[i], im = json.images[t.source], v = view(im.bufferView);
      const blob = new Blob([new Uint8Array(buf, v.off, v.len)], { type: im.mimeType });
      const url = URL.createObjectURL(blob);
      const img = await new Promise((ok, err) => {
        const e = new Image(); e.onload = () => ok(e); e.onerror = err; e.src = url;
      });
      const tex = new THREE.Texture(img);
      tex.flipY = false;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      if (srgb) tex.encoding = THREE.sRGBEncoding;
      tex.needsUpdate = true;
      texCache[key] = tex;
      return tex;
    }
    const mats = [];
    for (const m of json.materials || []) {
      const p = m.pbrMetallicRoughness || {}, c = p.baseColorFactor || [1, 1, 1, 1];
      const ex = m.extras || {};
      const mat = new THREE.MeshStandardMaterial({
        name: m.name || "",
        color: new THREE.Color(c[0], c[1], c[2]),
        metalness: p.metallicFactor ?? 1, roughness: p.roughnessFactor ?? 1,
        side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        flatShading: !!ex.flat,
        transparent: m.alphaMode === "BLEND", opacity: c[3],
        depthWrite: m.alphaMode !== "BLEND",
        alphaTest: m.alphaMode === "MASK" ? (m.alphaCutoff ?? 0.5) : 0,
      });
      if (m.emissiveFactor) mat.emissive = new THREE.Color().fromArray(m.emissiveFactor);
      if (p.baseColorTexture) mat.map = await texture(p.baseColorTexture.index, true);
      if (p.metallicRoughnessTexture) {
        const t = await texture(p.metallicRoughnessTexture.index, false);
        mat.roughnessMap = t; mat.metalnessMap = t;
      }
      if (m.occlusionTexture) mat.aoMap = await texture(m.occlusionTexture.index, false);
      if (m.normalTexture) {
        mat.normalMap = await texture(m.normalTexture.index, false);
        const s = m.normalTexture.scale ?? 1;
        mat.normalScale = new THREE.Vector2(s, -s);
      }
      mat.userData = ex;
      if (m.alphaMode === "MASK") {   // saç kartları: parlamasın, tuvalde yarı saydam kalmasın
        mat.envMapIntensity = 0.12; mat.roughness = 1; mat.color.multiplyScalar(0.6);
        mat.onBeforeCompile = (sh) => {
          sh.fragmentShader = sh.fragmentShader.replace("#include <alphatest_fragment>",
            "#include <alphatest_fragment>\n\tdiffuseColor.a = 1.0;");
        };
      }
      mats.push(mat);
    }
    const root = new THREE.Group();
    for (const n of json.nodes) {
      if (n.mesh === undefined) continue;
      const me = json.meshes[n.mesh], grp = new THREE.Group();
      grp.name = n.name || me.name || "";
      for (const pr of me.primitives) {
        const geo = new THREE.BufferGeometry(), at = pr.attributes;
        geo.setAttribute("position", new THREE.BufferAttribute(acc(at.POSITION), 3));
        if (at.NORMAL !== undefined) geo.setAttribute("normal", new THREE.BufferAttribute(acc(at.NORMAL), 3));
        if (at.TEXCOORD_0 !== undefined) {
          const uv = new THREE.BufferAttribute(acc(at.TEXCOORD_0), 2);
          geo.setAttribute("uv", uv); geo.setAttribute("uv2", uv);
        }
        if (pr.indices !== undefined) geo.setIndex(new THREE.BufferAttribute(acc(pr.indices), 1));
        if (at.NORMAL === undefined) geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mats[pr.material] || new THREE.MeshStandardMaterial());
        mesh.name = grp.name;
        grp.add(mesh);
      }
      root.add(grp);
    }
    return root;
  }

  g.ATGLB = { loadGLB, parseGLB };
})(window);
