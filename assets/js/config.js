/* =========================================================================
   SİTE AYARLARI — yalnız bu dosyayı düzenlemen yeterli.
   (Metinler 10 dilde assets/js/i18n.js içinde.)
   ========================================================================= */
/* 3D vitrin: modeller "Site Modelleri Hazırla" aracıyla oyun dosyalarından üretilir
   (Artificial Tool Admin\10_Site_Modelleri_Hazirla.bat → assets/models/<tür>/<ad>/model.json) */
function m3d(kind, slug, label, img) {
  return { label, img: img || "", model: "assets/models/" + kind + "/" + slug + "/model.json" };
}

window.SITE = {

  // Tanıtım videosu: YouTube bağlantısını aynen yapıştır (youtu.be/..., youtube.com/watch?v=...) ya da yalnız kimliği.
  // Boş bırakırsan "Video yakında" görünür.
  youtube: "https://www.youtube.com/watch?v=ZDJc6U62_gk",
  videoPoster: "assets/screens/1.png",

  // Lisans sunucusu (kod talepleri buraya gider → lisans paneli → Talepler)
  api: "https://api.artificialtool.org",

  // Bağlantılar
  launcher: "",                                  // ArtificialLauncher.exe indirme adresi (boşsa düğme "Launcher yakında" der)
  sales: true,                                   // false → satın alım "Yakında" (kod talebi kapalı)
  bmc: "https://buymeacoffee.com/badcnfaces",  // Buy Me a Coffee sayfan
  discord: "https://discord.gg/xuCJgxppgK",
  x: "https://x.com/Artificialtool",

  // Aylık abonelik fiyatları (görünen metin; sitede "/ ay" eklenir)
  prices: { lite: "1 €", standard: "10 €", ultimate: "25 €" },
  // Her sürümün Buy Me a Coffee ÜYELİK bağlantısı (Memberships → seviye → paylaş bağlantısı).
  // Boşsa yukarıdaki bmc. "KULLANICIADIN" kalırsa ödeme düğmeleri gizlenir.
  bmcLinks: { lite: "https://buymeacoffee.com/badcnfaces/membership", standard: "https://buymeacoffee.com/badcnfaces/membership", ultimate: "https://buymeacoffee.com/badcnfaces/membership" },
  // Buy Me a Coffee üyelik seviyelerinin "Welcome note" kısmına koyacağın bağlantılar
  // (form o sürüm seçili açılır):
  //   Lite     → https://www.artificialtool.org/?plan=lite#talep
  //   Standart → https://www.artificialtool.org/?plan=standard#talep
  //   Ultimate → https://www.artificialtool.org/?plan=ultimate#talep

  // Kayan şeritteki gerçek takımlar / oyuncular (img boşsa baş harfler görünür)
  teams: [
    { name: "Galatasaray", league: "Süper Lig" }, { name: "Fenerbahçe", league: "Süper Lig" },
    { name: "Beşiktaş", league: "Süper Lig" }, { name: "Trabzonspor", league: "Süper Lig" },
    { name: "Arsenal", league: "Premier League", img: "assets/site/arsenal.png" },
    { name: "Real Madrid", league: "LaLiga" }, { name: "FC Barcelona", league: "LaLiga" },
    { name: "Bayern München", league: "Bundesliga", img: "assets/site/bayern.png" },
    { name: "Borussia Dortmund", league: "Bundesliga" }, { name: "Paris Saint-Germain", league: "Ligue 1" },
    { name: "Napoli", league: "Serie A", img: "assets/site/napoli.png" }, { name: "Juventus", league: "Serie A" },
    { name: "Ajax", league: "Eredivisie" }, { name: "Shakhtar Donetsk", league: "UPL", img: "assets/site/shakhtar.png" },
    { name: "Türkiye", league: "Milli takım" }, { name: "Brasil", league: "Milli takım" },
  ],
  players: [
    { name: "Arda Güler", club: "Real Madrid", img: "assets/site/arda-guler.png" },
    { name: "Kenan Yıldız", club: "Juventus", img: "assets/site/kenan-yildiz.png" },
    { name: "Hakan Çalhanoğlu", club: "Inter" }, { name: "Orkun Kökçü", club: "Beşiktaş" },
    { name: "Kylian Mbappé", club: "Real Madrid", img: "assets/site/mbappe.png" },
    { name: "Erling Haaland", club: "Manchester City" },
    { name: "Bukayo Saka", club: "Arsenal", img: "assets/site/saka.png" },
    { name: "Mohamed Salah", club: "Trabzonspor", img: "assets/site/salah.png" },
    { name: "Florian Wirtz", club: "Liverpool", img: "assets/site/wirtz.png" },
    { name: "Vitinha", club: "Paris SG", img: "assets/site/vitinha.png" },
    { name: "Victor Osimhen", club: "Galatasaray", img: "assets/site/osimhen.png" },
    { name: "Dušan Vlahović", club: "Juventus", img: "assets/site/vlahovic.png" },
    { name: "Vedat Muriqi", club: "Mallorca" }, { name: "Cristiano Ronaldo", club: "Al Nassr" },
  ],

  /* 3D VİTRİN — her sekmede istediğin kadar model. Model dosyası yoksa "Model yakında" görünür.
     model : model.json yolu (aracın ürettiği)   ya da eski usul  parts: [{ fbx, texture, color, alpha }]
     img   : düğmedeki küçük resim (isteğe bağlı)   rotate: [x, y, z] derece (isteğe bağlı) */
  models: {
    player: { variants: [
      m3d("player", "arda-guler", "Arda Güler", "assets/site/arda-guler.png"),
      m3d("player", "ronaldo", "Cristiano Ronaldo", "assets/site/ronaldo.png"),
      m3d("player", "raphinha", "Raphinha", "assets/site/raphinha.png"),
      m3d("player", "haaland", "Erling Haaland", "assets/site/haaland.png"),
    ] },
    kit: { variants: [
      m3d("kit", "turkiye", "Türkiye", "assets/site/turkiye.png"),
      m3d("kit", "dortmund", "Borussia Dortmund", "assets/site/dortmund.png"),
      m3d("kit", "shakhtar", "Shakhtar Donetsk", "assets/site/shakhtar.png"),
      m3d("kit", "napoli", "Napoli", "assets/site/napoli.png"),
    ] },
    ball: { variants: [
      m3d("ball", "dunya-kupasi", "FIFA Dünya Kupası"),
      m3d("ball", "super-lig", "Süper Lig"),
    ] },
    trophy: { variants: [
      m3d("trophy", "avrupa-ligi", "UEFA Avrupa Ligi"),
      m3d("trophy", "konferans-ligi", "UEFA Konferans Ligi"),
      m3d("trophy", "premier-league", "Premier League"),
    ] },
  },

  // Ekran görüntüleri: assets/screens klasörüne 1.png, 2.png, 3.jpg … diye at — site kendisi bulur,
  // sırayla gösterir (yazı yok). Numarada boşluk bırakma. png / jpg / webp olur.
  screenshots: "auto",
};
