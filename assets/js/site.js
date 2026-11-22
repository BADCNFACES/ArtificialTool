/* Artificial Tool — site davranışları (dil, menü, video, hub'lar, galeri, talep formu) */
(function () {
  "use strict";
  const S = window.SITE || {};
  const I = window.I18N || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

  const LANGS = [
    ["tr", "Türkçe"], ["en", "English"], ["es", "Español"], ["de", "Deutsch"], ["fr", "Français"],
    ["it", "Italiano"], ["pt", "Português"], ["nl", "Nederlands"], ["pl", "Polski"], ["ar", "العربية"],
  ];
  // [anahtar, açıldığı sürüm, (varsa) tamamının açıldığı sürüm]
  const HUBS = [
    ["league", "lite"], ["tournament", "lite"], ["team", "lite"], ["player", "lite"], ["manager", "lite"], ["referee", "lite"],
    ["transfer", "lite"], ["locale", "lite"], ["db", "lite"],
    ["kits", "standard"], ["crossdata", "standard"], ["io", "standard"], ["cranium", "standard"], ["scripts", "standard"],
    ["realism", "standard"], ["gameplay", "standard"],
    ["face", "standard", "ultimate"], ["stadium", "standard", "ultimate"],
    ["compdata", "ultimate"], ["career", "ultimate"],
  ];

  let lang = "tr";
  function t(key) {
    for (const l of [lang, "en", "tr"]) {
      const d = I[l];
      if (d && d[key] !== undefined) return d[key];
    }
    return "";
  }
  window.T = t;

  function pickLang() {
    const q = new URLSearchParams(location.search).get("lang");
    let saved = "";
    try { saved = localStorage.getItem("at.lang") || ""; } catch (e) { /* özel pencere */ }
    const nav = (navigator.languages || [navigator.language || "tr"]).map(x => String(x).slice(0, 2).toLowerCase());
    for (const c of [q, saved, ...nav]) if (c && I[c]) return c;
    return "en";
  }

  function apply() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach(el => { const v = t(el.dataset.i18n); if (typeof v === "string" && v) el.textContent = v; });
    $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $("#lang-cur").textContent = lang.toUpperCase();
    $$("#lang-list button").forEach(b => b.setAttribute("aria-current", String(b.dataset.l === lang)));
    const hot = $(".plan.hot"); if (hot) hot.dataset.hot = t("plan.hot");
    if (t("meta.title")) document.title = t("meta.title");
    const md = $('meta[name="description"]'); if (md && t("meta.desc")) md.content = t("meta.desc");
    renderHubs(); renderPlans(); renderShots(); renderFaq(); togglePayer();
    document.dispatchEvent(new CustomEvent("at:lang", {detail: lang}));
  }

  function setLang(l) {
    lang = I[l] ? l : "en";
    try { localStorage.setItem("at.lang", lang); } catch (e) { /* yok */ }
    const u = new URL(location.href);
    u.searchParams.set("lang", lang);
    history.replaceState(null, "", u);
    apply();
  }

  // ------------------------------------------------------------ dil menüsü
  function buildLang() {
    const ul = $("#lang-list"), box = $("#lang");
    ul.innerHTML = LANGS.filter(([c]) => I[c]).map(([c, n]) =>
      `<li><button type="button" role="option" data-l="${c}"><span>${n}</span><small>${c.toUpperCase()}</small></button></li>`).join("");
    const btn = box.querySelector(":scope > button");
    btn.onclick = e => { e.stopPropagation(); const o = !box.classList.contains("open"); box.classList.toggle("open", o); btn.setAttribute("aria-expanded", o); };
    ul.onclick = e => { const b = e.target.closest("[data-l]"); if (b) { setLang(b.dataset.l); box.classList.remove("open"); } };
    document.addEventListener("click", () => box.classList.remove("open"));
    document.addEventListener("keydown", e => { if (e.key === "Escape") box.classList.remove("open"); });
  }

  // ------------------------------------------------------------ menü
  function buildNav() {
    const nav = $("#nav");
    $("#menu-btn").onclick = () => nav.classList.toggle("open");
    nav.addEventListener("click", e => { if (e.target.closest("a")) nav.classList.remove("open"); });
    const secs = $$("main section[id]");
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) $$("#nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
    }), {rootMargin: "-45% 0px -50% 0px"});
    secs.forEach(s => io.observe(s));
  }

  // ------------------------------------------------------------ bağlantılar
  function links() {
    $$("[data-link]").forEach(a => { const u = S[a.dataset.link]; if (u) a.href = u; });
    const dl = $("#dl-btn");
    if (S.launcher) { dl.href = S.launcher; dl.removeAttribute("target"); }
    else {                                   // launcher henüz yok → "yakında"
      dl.removeAttribute("href"); dl.classList.add("off"); dl.setAttribute("aria-disabled", "true");
      const sp = dl.querySelector("[data-i18n]"); if (sp) sp.dataset.i18n = "cta.dlSoon";
    }
    $$("[data-bmc]").forEach(a => {
      const u = (S.bmcLinks || {})[a.dataset.bmc] || S.bmc || "";
      if (!u || /KULLANICIADIN/.test(u)) a.style.display = "none"; else a.href = u;   // bağlantı girilmemiş
    });
    if (S.sales === false) {                 // ücretli sürüm satışı kapalı → "yakında"
      $$("[data-bmc]").forEach(a => { a.removeAttribute("href"); a.classList.add("off"); a.setAttribute("aria-disabled", "true"); a.dataset.i18n = "plan.soon"; });
      $$("[data-pick]").forEach(a => { a.style.display = "none"; });
      $$("#req-form input[name=edition]").forEach(r => { r.disabled = true; });
    }
    $$("[data-pick]").forEach(a => a.addEventListener("click", () => {
      const r = $(`#req-form input[name=edition][value=${a.dataset.pick}]`);
      if (r) { r.checked = true; togglePayer(); }
    }));
  }

  // ------------------------------------------------------------ kayan şerit
  function initials(n) { return n.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase(); }
  function chip(x, sub) {
    const img = x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<span class="dot">${esc(initials(x.name))}</span>`;
    return `<span class="chip">${img}${esc(x.name)}<small>${esc(sub || "")}</small></span>`;
  }
  function marquee() {
    if (!$("#mq-teams")) return;            // kayan şerit kaldırıldı
    const teams = (S.teams || []).map(x => chip(x, x.league)).join("");
    const players = (S.players || []).map(x => chip(x, x.club)).join("");
    $("#mq-teams").innerHTML = teams + teams;
    $("#mq-players").innerHTML = players + players;
  }

  // ------------------------------------------------------------ video
  function ytId(v) {
    v = String(v || "").trim();
    const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    return m ? m[1] : (/^[\w-]{11}$/.test(v) ? v : "");
  }
  function video() {
    const id = ytId(S.youtube), box = $("#video-box");
    if (!id) return;
    $("#video-soon").remove();
    const poster = S.videoPoster || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    box.insertAdjacentHTML("beforeend", `<img src="${esc(poster)}" alt="" loading="lazy"><button class="play" type="button" aria-label="Play"><i><svg><use href="#i-play"/></svg></i></button><span class="cap" data-i18n="video.cap">${esc(t("video.cap"))}</span>`);
    box.querySelector(".play").onclick = () => {
      box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&hl=${lang}" title="Artificial Tool" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    };
  }

  // ------------------------------------------------------------ hub'lar
  let hubFilter = "";
  function renderHubs() {
    const edName = {lite: "Lite", standard: t("ed.standard"), ultimate: "Ultimate", soon: t("tag.soon")};
    $("#hubs").innerHTML = HUBS.map(([k, ed, full]) => {
      const tags = t(`h.${k}.tags`);
      const show = !hubFilter || hubFilter === ed || hubFilter === full;
      const badge = full ? `${edName[ed]} · ${edName[full]}` : edName[ed];
      return `<article class="hub ${show ? "" : "hide"}">
        <header><h3>${esc(t(`h.${k}.t`))}</h3><span class="ed ${full || ed}">${esc(badge)}</span></header>
        <p>${esc(t(`h.${k}.p`))}</p>
        ${tags ? `<ul>${tags.split("·").map(s => `<li>${esc(s.trim())}</li>`).join("")}</ul>` : ""}</article>`;
    }).join("");
  }
  function hubFilters() {
    $("#hub-filters").onclick = e => {
      const b = e.target.closest("[data-ed]"); if (!b) return;
      hubFilter = b.dataset.ed;
      $$("#hub-filters button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      renderHubs();
    };
  }

  // ------------------------------------------------------------ sürümler
  function renderPlans() {
    $$("[data-list]").forEach(ul => {
      const items = t(ul.dataset.list) || [];
      ul.innerHTML = items.map((x, i) => `<li class="${i === 0 && ul.dataset.list !== "pl.lite" ? "inc" : ""}">${esc(x)}</li>`).join("");
    });
    const P = S.prices || {};
    ["lite", "standard", "ultimate"].forEach(k => {
      const el = $(`[data-price="${k}"]`);
      if (el) el.innerHTML = P[k] ? `${esc(P[k])} <small>${esc(t("plan.once"))}</small>` : `<small>${esc(t("plan.seeBmc"))}</small>`;
      $$(`[data-price-mini="${k}"]`).forEach(s => { s.textContent = S.sales === false ? t("f.paidSoon") : (P[k] ? P[k] + " " + t("plan.once") : t("plan.paidShort")); });
    });
  }

  // ------------------------------------------------------------ görüntüler
  // Görüntüler: assets/screens/1.png, 2.png, 3.jpg … sırayla bulunur (yazı yok, istediğin kadar resim)
  let shots = [], cur = 0, shotsShown = 12, shotsFound = null;
  const SHOT_EXT = ["png", "jpg", "jpeg", "webp"];
  async function findShots() {
    if (Array.isArray(S.screenshots)) return S.screenshots.map(x => (typeof x === "string" ? x : x.src));
    const dir = (typeof S.screenshots === "string" && S.screenshots !== "auto" ? S.screenshots : "assets/screens/").replace(/\/?$/, "/");
    const head = u => fetch(u, {method: "HEAD"}).then(r => r.ok ? u : null).catch(() => null);
    const one = async i => { for (const e of SHOT_EXT) { const u = await head(`${dir}${i}.${e}`); if (u) return u; } return null; };
    const out = []; let miss = 0;
    for (let i = 1; i <= 500 && miss < 3; i += 12) {          // 12'şer paralel; 3 boş grup → dur
      const got = await Promise.all(Array.from({length: 12}, (_, k) => one(i + k)));
      const hits = got.filter(Boolean);
      out.push(...hits); miss = hits.length ? 0 : miss + 1;
      if (hits.length && got.lastIndexOf(null) > got.lastIndexOf(hits[hits.length - 1])) break;   // dizinin sonu
    }
    return out;
  }
  function renderShots() {
    const box = $("#shots"); if (!box) return;
    if (shotsFound === null) {
      shotsFound = [];
      findShots().then(list => { shotsFound = list; renderShots(); });
      return;
    }
    shots = shotsFound;
    $("#goruntuler").hidden = !shots.length;
    box.innerHTML = shots.slice(0, shotsShown).map((src, i) =>
      `<figure class="shot" data-i="${i}" tabindex="0"><img src="${esc(src)}" alt="" loading="lazy"></figure>`).join("");
    const more = $("#shots-more");
    if (more) {
      more.hidden = shots.length <= shotsShown;
      more.textContent = `${t("shots.more")} (${shots.length - shotsShown})`;
      more.onclick = () => { shotsShown += 12; renderShots(); };
    }
  }
  function lightbox() {
    const lb = $("#lb");
    const show = i => { if (!shots.length) return; cur = (i + shots.length) % shots.length; $("#lb-img").src = shots[cur]; $("#lb-cap").textContent = `${cur + 1} / ${shots.length}`; lb.classList.add("on"); };
    $("#shots").addEventListener("click", e => { const f = e.target.closest("[data-i]"); if (f) show(+f.dataset.i); });
    $("#shots").addEventListener("keydown", e => { const f = e.target.closest("[data-i]"); if (f && e.key === "Enter") show(+f.dataset.i); });
    lb.addEventListener("click", e => {
      if (e.target.closest(".prev")) return show(cur - 1);
      if (e.target.closest(".next")) return show(cur + 1);
      if (e.target === lb || e.target.closest("[data-close]")) lb.classList.remove("on");
    });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("on")) return;
      if (e.key === "Escape") lb.classList.remove("on");
      if (e.key === "ArrowRight") show(cur + (lang === "ar" ? -1 : 1));
      if (e.key === "ArrowLeft") show(cur + (lang === "ar" ? 1 : -1));
    });
  }

  // ------------------------------------------------------------ SSS
  function renderFaq() {
    const qa = t("faq") || [];
    $("#faq").innerHTML = qa.map(([q, a], i) => `<details ${i === 0 ? "open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
  }

  // ------------------------------------------------------------ talep formu
  function edition() { const r = $("#req-form input[name=edition]:checked"); return r ? r.value : "ultimate"; }
  function kind() { const r = $("#req-form input[name=kind]:checked"); return r ? r.value : "new"; }
  function needsKey() { return kind() === "renew" || kind() === "upgrade"; }
  function togglePayer() {
    const f = $("#f-renew"); if (f) f.style.display = needsKey() ? "" : "none";
    const h = $("#renew_hint");
    if (h) { const k = kind() === "upgrade" ? "f.upgradeHint" : "f.renewHint"; h.setAttribute("data-i18n", k); h.textContent = t(k) || h.textContent; }
  }
  // Buy Me a Coffee "Welcome note" bağlantısı: ?plan=lite|standard|ultimate[&renew=1]#talep
  function fromWelcome() {
    const q = new URLSearchParams(location.search), plan = (q.get("plan") || "").toLowerCase();
    const renew = q.get("renew") === "1";
    if (!["lite", "standard", "ultimate"].includes(plan) && !renew && q.get("upgrade") !== "1") return;
    const r = plan && $(`#req-form input[name=edition][value=${plan}]`);
    if (r && !r.disabled) r.checked = true;
    const up = q.get("upgrade") === "1";
    if (renew || up) { const k = $(`#req-form input[name=kind][value=${up ? "upgrade" : "renew"}]`); if (k) k.checked = true; }
    togglePayer();
    const msg = $("#form-msg"); if (msg) { msg.className = "form-msg ok"; msg.textContent = t("f.welcome"); }
    setTimeout(() => { const s = $("#talep"); if (s) s.scrollIntoView({behavior: "smooth", block: "start"}); }, 400);
  }
  function form() {
    const f = $("#req-form"), msg = $("#form-msg"), send = $("#f-send");
    f.addEventListener("change", e => { if (e.target.name === "edition" || e.target.name === "kind") togglePayer(); });
    togglePayer();
    fromWelcome();
    const err = k => { msg.className = "form-msg err"; msg.textContent = t("err." + k) || t("err.GENERIC"); };
    f.addEventListener("submit", async e => {
      e.preventDefault();
      msg.className = "form-msg"; msg.textContent = "";
      const ed = edition();
      const email = $("#email").value.trim(), email2 = $("#email2").value.trim();
      const payer = $("#payer").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return err("BAD_EMAIL");
      if (email.toLowerCase() !== email2.toLowerCase()) return err("MISMATCH");
      if (!payer) return err("NO_PAYER");
      const bmc_email = ($("#bmc_email") ? $("#bmc_email").value.trim() : "");
      if (bmc_email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(bmc_email)) return err("BAD_BMC_EMAIL");
      const renew = needsKey() ? $("#renew_key").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
      if (needsKey() && renew.length !== 20) return err("BAD_KEY");
      const renew_key = renew ? renew.match(/.{5}/g).join("-") : "";
      const upgrade = kind() === "upgrade";
      if (!$("#consent").checked) return err("CONSENT");
      send.disabled = true; send.querySelector("span").textContent = t("f.sending");
      try {
        const res = await fetch((S.api || "").replace(/\/+$/, "") + "/v1/request", {
          method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"},
          body: JSON.stringify({edition: ed, email, payer, ref: $("#ref").value.trim(), discord: $("#discord").value.trim(),
            note: $("#note").value.trim(), lang, website: f.website.value, renew_key, upgrade, bmc_email})});
        const r = await res.json();
        if (!r.ok) throw new Error(r.error || "GENERIC");
        f.innerHTML = `<div class="done"><span class="pill"><b>OK</b>${esc(t("f.okTitle"))}</span><b class="grad-text mono">${esc(r.code)}</b><p class="muted">${esc(t("f.okText"))}</p></div>`;
      } catch (ex) {
        err(String(ex.message || "").match(/^[A-Z_]+$/) ? ex.message : "NETWORK");
        send.disabled = false; send.querySelector("span").textContent = t("f.send");
      }
    });
  }

  // ------------------------------------------------------------ belirme
  function reveal() {
    if (!("IntersectionObserver" in window)) { $$(".rv").forEach(x => x.classList.add("is-in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
      {rootMargin: "0px 0px -8% 0px"});
    $$(".rv").forEach(x => io.observe(x));
  }


  // ------------------------------------------------------------ TR büyük harf
  // Türkçe sayfada büyük harfe çevrilen başlıklarda yabancı adlar "LİTE", "KİTS" olmasın:
  // bu kelimeleri lang="en" ile sar (yalnız i harfi içeren yabancı adlar).
  const EN_WORDS = ["Lite", "Ultimate", "Kits", "Cranium", "Scripts", "Artificial", "ArtFaceial", "Editor", "Realism", "Studio", "Tifo",
    "Stadium", "Hair", "Rating", "Import", "Premier", "League", "LaLiga", "Liga", "Real", "Madrid", "Borussia", "Bayern", "Juventus", "Inter",
    "Paris", "Saint", "Germain", "City", "Liverpool", "Kylian", "Erling", "Florian", "Wirtz", "Vitinha", "Victor", "Osimhen", "Muriqi",
    "Cristiano", "Mohamed", "Mikel", "Arteta", "Cruijff", "Brasil", "Napoli", "Serie", "Ligue", "Bundesliga", "Eredivisie", "Champions",
    "Mbappé", "Vlahović", "Dušan", "Saka", "Haaland", "Salah", "Nassr", "Mallorca", "Gameplay", "Comp", "Hub", "Tool", "Launcher"];
  const EN_RE = new RegExp("(?<![\\p{L}])(" + EN_WORDS.join("|") + ")(?![\\p{L}])", "gu");
  let enQueued = false;
  function enWrap() {
    enQueued = false;
    if (lang !== "tr") return;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode: n =>
      (n.parentElement && !n.parentElement.closest("script,style,textarea,input,[lang=en]") && /[iI]/.test(n.data)
        && getComputedStyle(n.parentElement).textTransform === "uppercase" && (EN_RE.lastIndex = 0, EN_RE.test(n.data)))
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
    const nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
    for (const n of nodes) {
      const f = document.createDocumentFragment(); let last = 0; EN_RE.lastIndex = 0;
      n.data.replace(EN_RE, (m, w, i) => {
        if (i > last) f.append(n.data.slice(last, i));
        const sp = document.createElement("x-en"); sp.setAttribute("lang", "en"); sp.textContent = m; f.append(sp); last = i + m.length; return m;
      });
      if (last < n.data.length) f.append(n.data.slice(last));
      n.replaceWith(f);
    }
  }
  function queueEn() { if (!enQueued && lang === "tr") { enQueued = true; requestAnimationFrame(enWrap); } }
  try { new MutationObserver(queueEn).observe(document.body, {childList: true, subtree: true, characterData: true}); } catch (e) { /* eski tarayıcı */ }

  lang = pickLang();
  buildLang(); buildNav(); links(); marquee(); hubFilters(); lightbox(); form();
  apply(); video(); reveal(); queueEn();

  // 3D modülü (CDN) yüklenemezse vitrinde hata göster
  setTimeout(() => {
    if (window.__at3d) return;
    const st = $("#v-state");
    const sub = location.protocol === "file:"
      ? "Sayfa dosyadan açıldı; tarayıcı 3D modülünü engelliyor. Önizleme için Artificial Tool Admin klasöründeki 11_Site_Onizle.bat'ı çalıştır."
      : t("v.error");
    if (st) { st.style.display = "grid"; st.innerHTML = `<div><b>${esc(t("v.errorTitle"))}</b><span>${esc(sub)}</span></div>`; }
  }, 9000);
})();
