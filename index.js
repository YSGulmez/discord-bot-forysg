const express = require("express");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Akasya Durağı 7/24 Aktif usta!");
});

app.listen(port, () => {
  console.log(`Web sunucusu ${port} portunda.`);
});

// --- DİSCORD BOT KODLARI ---
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const path = require("path");
const stateFilePath = path.join(__dirname, "free-games-state.json");
const FREE_GAMES_CHANNEL_ID = process.env.FREE_GAMES_CHANNEL_ID || "1526661101608112158";
const FREE_GAMES_CHECK_INTERVAL_MS = Number(
  process.env.FREE_GAMES_CHECK_INTERVAL_MS || 1800000,
);
const MC_SERVER_HOST = process.env.MC_SERVER_HOST || "akasya_duragi.aternos.me";
const MC_SERVER_PORT = process.env.MC_SERVER_PORT || "25565";
const MC_SERVER_CHANNEL_ID = process.env.MC_SERVER_CHANNEL_ID || FREE_GAMES_CHANNEL_ID;
const MC_SERVER_CHECK_INTERVAL_MS = Number(
  process.env.MC_SERVER_CHECK_INTERVAL_MS || 60000,
);
const ATERNOS_SERVER_ID = process.env.ATERNOS_SERVER_ID;
const ATERNOS_API_BASE_URL = process.env.ATERNOS_API_BASE_URL || "https://aternos.org";
const ATERNOS_SESSION_COOKIE = process.env.ATERNOS_SESSION_COOKIE || process.env.ATERNOS_COOKIE;
const ATERNOS_SESSION_TOKEN = process.env.ATERNOS_SESSION_TOKEN;
const ATERNOS_AUTH_HEADER = process.env.ATERNOS_AUTH_HEADER;

// Aternos API endpoint'leri
const ATERNOS_API_ENDPOINTS = {
  start: "/api/start",
  stop: "/api/stop",
  status: "/api/status",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers, // Moderasyon işlemleri (ban/kick) için şart
  ],
});

function loadFreeGamesState() {
  try {
    const state = JSON.parse(fs.readFileSync(stateFilePath, "utf8"));
    return {
      lastNotified: Array.isArray(state.lastNotified) ? state.lastNotified : [],
      minecraftWasOnline: Boolean(state.minecraftWasOnline),
    };
  } catch {
    return { lastNotified: [], minecraftWasOnline: false };
  }
}

function saveFreeGamesState(state) {
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

async function fetchEpicFreeGames() {
  console.log("[DEBUG] Epic Games API çağrılıyor...");
  const response = await fetch(
    "https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=TR&allowCountries=TR",
  );

  if (!response.ok) {
    console.error(`[ERROR] Epic Games API hatası: ${response.status}`);
    throw new Error(`Epic Games API hatası: ${response.status}`);
  }

  const data = await response.json();
  console.log("[DEBUG] Epic Games raw data elements sayısı:", data?.data?.Catalog?.searchStore?.elements?.length);
  const elements = data?.data?.Catalog?.searchStore?.elements || [];
  const filtered = elements
    .filter((item) => {
      const price = item?.price?.totalPrice;
      const isFree = price?.discountPrice === 0 && price?.originalPrice === 0;
      console.log("[DEBUG EPIC FILTER]", {
        title: item?.title || item?.name,
        price: price,
        isFree: isFree,
        hasPromo: item?.promotions?.promotionalOffers?.length > 0,
        hasSlug: !!item?.productSlug
      });
      return isFree && (item?.promotions?.promotionalOffers?.length > 0 || item?.productSlug);
    });
  console.log("[DEBUG] Epic Games filtrelenmiş oyun sayısı:", filtered.length);
  return filtered.map((item) => ({
      source: "epic",
      title: item.title || item.name || "Bilinmeyen Oyun",
      slug: `epic:${item.productSlug || item.urlSlug || item.title || ""}`,
      description: item.description || "Ücretsiz oyun fırsatı çıktı!",
      image:
        item.keyImages?.find((img) => img.type === "OfferImageWide")?.url ||
        item.keyImages?.[0]?.url ||
        "",
      link: item.urlSlug ? `https://store.epicgames.com/tr/p/${item.urlSlug}` : "",
    }));
}

async function fetchSteamFreeGames() {
  console.log("[DEBUG] Steam API çağrılıyor...");
  const response = await fetch("https://store.steampowered.com/api/featuredcategories/");

  if (!response.ok) {
    console.error(`[ERROR] Steam API hatası: ${response.status}`);
    throw new Error(`Steam API hatası: ${response.status}`);
  }

  const data = await response.json();
  console.log("[DEBUG] Steam raw specials sayısı:", data?.specials?.items?.length);
  const specials = data?.specials?.items || [];
  const filtered = specials
    .filter((item) => {
      const finalPrice = Number(item?.price?.final ?? 0);
      const initialPrice = Number(item?.price?.initial ?? 0);
      console.log("[DEBUG STEAM FILTER]", {
        title: item?.name,
        finalPrice: finalPrice,
        initialPrice: initialPrice,
        isFree: finalPrice <= 0 && initialPrice > 0
      });
      return finalPrice <= 0 && initialPrice > 0;
    });
  console.log("[DEBUG] Steam filtrelenmiş oyun sayısı:", filtered.length);
  return filtered.map((item) => ({
      source: "steam",
      title: item.name || "Bilinmeyen Steam Oyunu",
      slug: `steam:${item.id || item.name}`,
      description: `${item.name || "Bu oyun"} Steam'de ücretsiz olarak sunuluyor.`,
      image: item.header_image || item.large_capsule_image || "",
      link: item.id ? `https://store.steampowered.com/app/${item.id}` : "",
    }));
}

async function notifyFreeGames() {
  if (!FREE_GAMES_CHANNEL_ID) {
    return;
  }

  try {
    const state = loadFreeGamesState();
    const [epicGames, steamGames] = await Promise.all([
      fetchEpicFreeGames(),
      fetchSteamFreeGames(),
    ]);
    const freeGames = [...epicGames, ...steamGames];
    const newGames = freeGames.filter(
      (game) => !state.lastNotified.includes(game.slug || game.title),
    );

    if (newGames.length === 0) {
      return;
    }

    const channel =
      client.channels.cache.get(FREE_GAMES_CHANNEL_ID) ||
      (await client.channels.fetch(FREE_GAMES_CHANNEL_ID).catch(() => null));

    if (!channel?.send) {
      console.error("Ücretsiz oyun kanalı bulunamadı veya erişilemedi.");
      return;
    }

    for (const game of newGames) {
      const embed = new EmbedBuilder()
        .setTitle(
          game.source === "steam"
            ? `🎮 Steam Ücretsiz Oyun: ${game.title}`
            : `🆓 Epic Ücretsiz Oyun: ${game.title}`,
        )
        .setDescription(`${game.description}\n\nHemen kontrol et!`)
        .setColor(game.source === "steam" ? "#1B2838" : "#00AEEF")
        .setTimestamp();

      if (game.image) {
        embed.setImage(game.image);
      }

      if (game.link) {
        embed.setURL(game.link);
      }

      await channel.send({ embeds: [embed] });
      state.lastNotified.push(game.slug || game.title);
    }

    saveFreeGamesState(state);
    console.log(`${newGames.length} yeni ücretsiz oyun bildirimi gönderildi.`);
  } catch (error) {
    console.error("Ücretsiz oyun takip hatası:", error);
  }
}

async function getMinecraftServerStatus() {
  const response = await fetch(
    `https://api.mcsrvstat.us/2/${MC_SERVER_HOST}${MC_SERVER_PORT ? `:${MC_SERVER_PORT}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Minecraft API hatası: ${response.status}`);
  }

  const data = await response.json();
  return {
    online: Boolean(data?.online),
    playersOnline: data?.players?.online ?? 0,
    playersMax: data?.players?.max ?? 0,
    version: data?.version || "Bilinmiyor",
    hostname: data?.hostname || `${MC_SERVER_HOST}:${MC_SERVER_PORT}`,
  };
}

async function controlAternosServer(action) {
  console.log("[DEBUG] Aternos API çağrısı başlıyor...");
  console.log("[DEBUG] Action:", action);
  console.log("[DEBUG] Server ID:", ATERNOS_SERVER_ID);
  console.log("[DEBUG] Cookie boş mu?", !ATERNOS_SESSION_COOKIE);
  
  if (!ATERNOS_SERVER_ID) {
    console.error("[ERROR] ATERNOS_SERVER_ID tanımlı değil.");
    throw new Error("ATERNOS_SERVER_ID tanımlı değil.");
  }

  // Action'ı endpoint'e çevir
  const endpoint = ATERNOS_API_ENDPOINTS[action];
  if (!endpoint) {
    console.error("[ERROR] Geçersiz Aternos aksiyonu:", action);
    throw new Error(`Geçersiz Aternos aksiyonu: ${action}`);
  }

  const headers = {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json",
  };

  if (ATERNOS_SESSION_COOKIE) {
    headers.Cookie = ATERNOS_SESSION_COOKIE;
  }

  if (ATERNOS_SESSION_TOKEN) {
    headers["X-Session-Token"] = ATERNOS_SESSION_TOKEN;
  }

  if (ATERNOS_AUTH_HEADER) {
    headers.Authorization = ATERNOS_AUTH_HEADER;
  }

  const url = `${ATERNOS_API_BASE_URL}${endpoint}/${ATERNOS_SERVER_ID}`;
  console.log("[DEBUG] Request URL:", url);
  
  const response = await fetch(url, {
    method: "POST",
    headers,
  });

  const text = await response.text();
  let payload = text;

  try {
    payload = JSON.parse(text);
  } catch {
    // Plain text response, ignore
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function notifyMinecraftServerStatus() {
  if (!MC_SERVER_HOST || !MC_SERVER_CHANNEL_ID) {
    return;
  }

  try {
    const state = loadFreeGamesState();
    const status = await getMinecraftServerStatus();
    const wasOnline = Boolean(state.minecraftWasOnline);
    const isOnline = status.online;

    if (isOnline && !wasOnline) {
      const channel =
        client.channels.cache.get(MC_SERVER_CHANNEL_ID) ||
        (await client.channels.fetch(MC_SERVER_CHANNEL_ID).catch(() => null));

      if (channel?.send) {
        const embed = new EmbedBuilder()
          .setTitle("🟢 Aternos Sunucusu Açıldı")
          .setDescription(
            `${status.hostname} adresindeki sunucu artık açık!\n\nAktif oyuncu: ${status.playersOnline}/${status.playersMax}\nSürüm: ${status.version}`,
          )
          .setColor("#2ECC71")
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    }

    if (!isOnline && wasOnline) { 
      const channel =
        client.channels.cache.get(MC_SERVER_CHANNEL_ID) ||
        (await client.channels.fetch(MC_SERVER_CHANNEL_ID).catch(() => null));

      if (channel?.send) {
        const embed = new EmbedBuilder()
          .setTitle("🔴 Aternos Sunucusu Kapandı")
          .setDescription(
            `${status.hostname} adresindeki sunucu şu an kapalı.`,
          )
          .setColor("#E74C3C")
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }
    }

    state.minecraftWasOnline = isOnline;
    saveFreeGamesState(state);
  } catch (error) {
    console.error("Minecraft sunucu takip hatası:", error);
  }
}

client.once("ready", () => {
  console.log("Akasya Durağı telsizi açıldı, bot hazır!");

  // Botun durum/aktivite açıklamasını ayarlıyoruz
  client.user.setActivity("!yardım | Akasya Durağı Telsizi", {
    type: ActivityType.Listening,
  });

  if (FREE_GAMES_CHANNEL_ID) {
    notifyFreeGames();
    setInterval(notifyFreeGames, FREE_GAMES_CHECK_INTERVAL_MS);
    console.log(
      `Ücretsiz oyun takipçisi aktif. Kanal: ${FREE_GAMES_CHANNEL_ID} | Aralık: ${FREE_GAMES_CHECK_INTERVAL_MS / 1000} sn`,
    );
  }

  if (MC_SERVER_HOST) {
    notifyMinecraftServerStatus();
    setInterval(notifyMinecraftServerStatus, MC_SERVER_CHECK_INTERVAL_MS);
    console.log(
      `Minecraft sunucu takibi aktif. Sunucu: ${MC_SERVER_HOST}:${MC_SERVER_PORT} | Aralık: ${MC_SERVER_CHECK_INTERVAL_MS / 1000} sn`,
    );
  }
});

// Zibilyon tane replik havuzu
const replikler = [
  "Ooo tırnakçı kardeş, naber ya? - Sinan Kaya 🚕",
  "Bana bak Sinan, yine ne haltlar karıştırıyorsun ulan! - Melahat 😡",
  "Oy kuymak kafalım benim, uyyy! - Temel 🐟",
  "Ulan Sinan, senin yüzünden yine karakolluk olduk! - Usman Aga 🪓",
  "Cezmi bey, tırnakçılara dikkat edelim lütfen. - Mazhar Bey 🕶️",
  "Seyit kardeş, memleketten tereyağ getirdin mi da? - Temel 🧈",
  "Hallederiz kadim dostum, hallederiz... - Sinan Kaya 😏",
  "Kızanlar yine ne işler karıştırıyor be ya! - Usman Aga 🚜",
  "Hay aksi şeytan! Yine teker patladı... - Nuri Baba 👨‍✈️",
  "Biz bu durağın direğiyiz direği! - Ali Kemal 🛠️",
  "Ben bu taksiye canımı verdim be! - Arif Işık 🚖",
];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();
  const args = message.content.split(" "); // Moderasyon komutları için argümanlar

  // ==========================================
  // 1. GENEL YARDIM MENÜSÜ
  // ==========================================
  if (msg === "!yardım" || msg === "!yardim" || msg === "!komutlar") {
    const yardimMesaji = `
🚕 **AKASYA DURAĞI TELSİZİNE HOŞ GELDİNİZ, USTA!** 🚕
Duraktaki tüm komutlar aşağıdadır:

💬 **Coşturma & Eğlence Komutları:**
• \`sinan\` veya \`sinan kaya\` : Sinan Kaya'nın dertlerini dinlersin.
• \`usman aga\` : Usman Aga'yı delirtirsin.
• \`nuri baba\` : Nuri Baba'nın nasihatini alırsın.
• \`arif\` : Arif'in felsefesini dinlersin.
• \`temel\` : Temel'den bir uyyy alırsın.
• \`!replik\` : Duraktan rastgele efsane bir replik fırlatır.
• \`taksi\` / \`taksi yolla\` : Olduğun ses kanalına girer, kornaya basar/replik çalar ve çıkar.

 **Ücretsiz Oyun Takibi:**
• \`!free\` : Ücretsiz oyun takibini başlatır / kontrol eder.
• \`!epic\` : Epic Games ücretsiz oyunlarını kontrol eder.
• \`!steam\` : Steam ücretsiz oyunlarını kontrol eder.

🧱 **Minecraft / Aternos:**
• \`!aternos\` / \`!mc\` / \`!minecraft\` : Sunucu durumunu gösterir.
• \`!aternos start\` / \`!mc start\` : Sunucuyu başlatma isteği gönderir.
• \`!aternos stop\` / \`!mc stop\` : Sunucuyu kapatma isteği gönderir.

🛠️ **Moderatör (Güvenlik) Komutları:**
• \`!sil <sayı>\` : Belirttiğin miktar kadar mesajı anında süpürür. (Örn: \`!sil 10\`)
• \`!kick @kullanıcı <sebep>\` : Kurallara uymayan tırnakçıyı sunucudan tekmeler.
• \`!ban @kullanıcı <sebep>\` : Sıkıntı çıkaranı duraktan ömür boyu sürgün eder.

*Akasya Durağı her zaman 10 numara hizmet verir!* 🚖
        `;
    return message.reply(yardimMesaji);
  }

  if (msg === "!aternos" || msg === "!mc" || msg === "!minecraft") {
    try {
      const status = await getMinecraftServerStatus();
      const durum = status.online ? "🟢 Açık" : "🔴 Kapalı";
      return message.reply(
        `Aternos sunucu durumu: **${durum}**\nAdres: ${status.hostname}\nOyuncu: ${status.playersOnline}/${status.playersMax}\nSürüm: ${status.version}`,
      );
    } catch (error) {
      console.error(error);
      return message.reply("Sunucu durumu kontrol edilemedi usta.");
    }
  }

  if (msg.startsWith("!aternos ") || msg.startsWith("!mc ") || msg.startsWith("!minecraft ")) {
    const action = args[1]?.toLowerCase();
    const actionText = args.slice(1).join(" ").toLowerCase();

    if (["start", "başlat", "ac", "aç"].includes(action || actionText)) {
      try {
        const result = await controlAternosServer("start");
        if (result.ok) {
          return message.reply("Aternos sunucusu başlatma isteği gönderildi usta. ⏳");
        }
        return message.reply(`Başlatma isteği gönderilemedi. Durum: ${result.status}`);
      } catch (error) {
        console.error(error);
        return message.reply("Başlatma komutu çalıştırılamadı. Aternos ayarlarını kontrol et.");
      }
    }

    if (["stop", "durdur", "kapat", "kapat"].includes(action || actionText)) {
      try {
        const result = await controlAternosServer("stop");
        if (result.ok) {
          return message.reply("Aternos sunucusu kapatma isteği gönderildi usta. ⏳");
        }
        return message.reply(`Kapatma isteği gönderilemedi. Durum: ${result.status}`);
      } catch (error) {
        console.error(error);
        return message.reply("Kapatma komutu çalıştırılamadı. Aternos ayarlarını kontrol et.");
      }
    }

    return message.reply("Kullanım: `!aternos start` | `!aternos stop` | `!aternos` ⚙️");
  }

  // ==========================================
  // ÜCRETSİZ OYUN KOMUTLARI
  // ==========================================
  if (msg === "!free" || msg === "!free check") {
    try {
      await notifyFreeGames();
      return message.reply("✅ Ücretsiz oyun kontrolü yapıldı! Yeni oyun varsa kanala gönderildi.");
    } catch (error) {
      console.error("!free komut hatası:", error);
      return message.reply("❌ Ücretsiz oyun kontrolü sırasında hata oluştu.");
    }
  }

  if (msg === "!epic") {
    try {
      const games = await fetchEpicFreeGames();
      if (games.length === 0) {
        return message.reply("😔 Şu an Epic Games'de ücretsiz oyun yok.");
      }
      for (const game of games) {
        const embed = new EmbedBuilder()
          .setTitle(`🆓 Epic Games: ${game.title}`)
          .setDescription(game.description)
          .setColor("#00AEEF")
          .setURL(game.link)
          .setTimestamp();
        if (game.image) embed.setImage(game.image);
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("!epic komut hatası:", error);
      return message.reply("❌ Epic Games verisi alınamadı.");
    }
  }

  if (msg === "!steam") {
    try {
      const games = await fetchSteamFreeGames();
      if (games.length === 0) {
        return message.reply("😔 Şu an Steam'de ücretsiz oyun (indirimli) yok.");
      }
      for (const game of games) {
        const embed = new EmbedBuilder()
          .setTitle(`🎮 Steam: ${game.title}`)
          .setDescription(game.description)
          .setColor("#1B2838")
          .setURL(game.link)
          .setTimestamp();
        if (game.image) embed.setImage(game.image);
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("!steam komut hatası:", error);
      return message.reply("❌ Steam verisi alınamadı.");
    }
  }

  // ==========================================
  // 2. MARVEL SAYAÇ KOMUTLARI
  // ==========================================

  function kalanSureyiHesapla(hedefTarih) {
    const simdi = new Date();
    const fark = hedefTarih - simdi;

    if (fark <= 0) {
      return "VİZYONDA! 🍿🎬";
    }

    const gun = Math.floor(fark / (1000 * 60 * 60 * 24));
    const saat = Math.floor((fark % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));

    return `⏳ **${gun} Gün, ${saat} Saat, ${dakika} Dakika** kaldı!`;
  }

  if (msg === "!spiderman" || msg === "!spiderman4" || msg === "!örümcekadam") {
    const vizyonTarihi = new Date("2026-07-31T00:00:00+03:00"); // TR saati ile vizyon
    const kalan = kalanSureyiHesapla(vizyonTarihi);

    const embed = new EmbedBuilder()
      .setTitle("🕷️ Spider-Man: Brand New Day Sayacı")
      .setDescription(
        `Tom Holland'ın başrolünde olduğu yeni Örümcek Adam macerasının vizyona girmesine:\n\n${kalan}`,
      )
      .setColor("#E23636") // Örümcek Adam kırmızısı
      .setThumbnail("https://i.ibb.co/v4b4XqY/sinan-kaya.jpg") // İstersen buraya film afişi linki de koyabilirsin usta
      .setFooter({ text: "Akasya Durağı Sinema Kulübü Sunar 🍿" })
      .setTimestamp();

    try {
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("Embed göndermek için yetkim yetmiyor usta! Lütfen bot rolümün izinlerini kontrol et.");
    }
  }

  // AVENGERS DOOMSDAY SAYACI
  if (msg === "!doomsday" || msg === "!avengers" || msg === "!kıyamet") {
    const vizyonTarihi = new Date("2026-12-18T00:00:00+03:00"); // TR saati ile vizyon
    const kalan = kalanSureyiHesapla(vizyonTarihi);

    const embed = new EmbedBuilder()
      .setTitle("🟢 Avengers: Doomsday Sayacı")
      .setDescription(
        `Robert Downey Jr.'ın **Doctor Doom** olarak Marvel evrenine döndüğü devasa filmin vizyona girmesine:\n\n${kalan}`,
      )
      .setColor("#107C10") // Doctor Doom yeşili
      .setFooter({ text: "Melahat duymasın, bilet parası Sinan'dan! 🚖" })
      .setTimestamp();

    try {
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("Embed göndermek için yetkim yetmiyor usta! Lütfen bot rolümün izinlerini kontrol et.");
    }
  }

  // ==========================================
  // 2. MİZAHİ & EĞLENCE KOMUTLARI (ZİBİLYON TANE)
  // ==========================================
  if (msg === "!replik") {
    const rastgeleReplik =
      replikler[Math.floor(Math.random() * replikler.length)];
    message.reply(rastgeleReplik);
  }

  // ==========================================
  // 3. SES KANALINA GİRİP SES DOSYASI OYNATMA
  // ==========================================
  if (msg === "taksi" || msg === "taksi çağır" || msg === "taksi yolla") {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.reply(
        "Usta önce bir ses kanalına gir be ya, taksiyi göğe mi yollayayım? 🚖",
      );
    }

    try {
      message.reply(
        "Anlaşıldı merkez, Akasya Durağından bir taksi yolluyorum! 🚖",
      );

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const resource = createAudioResource(
        path.join(__dirname, "Sounds", "Taksi.mp3"),
      );
      const player = createAudioPlayer();

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        message.channel.send(
          "Taksi adrese ulaştı, müşteri alındı usta! Çıkıyorum. 👋",
        );
      });
    } catch (error) {
      console.error(error);
      message.reply(
        "Taksi yolda kaza yaptı usta, gelemedi! (Ses dosyası eksik veya okunmadı)",
      );
    }
  }

  // ==========================================
  // 4. MODERASYON (GÜVENLİK) SİSTEMİ
  // ==========================================

  // MESAJ SİLME KOMUTU (!sil <sayı>)
  if (msg.startsWith("!sil")) {
    // Yetki Kontrolü
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      return message.reply(
        "Hop hemşerim! Mesajları silmek için senin yetkin yetmiyor be ya! 🛑",
      );
    }

    // Komuttan sonra gelen sayıyı alıyoruz
    const miktar = parseInt(args[1]);

    if (isNaN(miktar) || miktar < 1 || miktar > 100) {
      return message.reply(
        "Usta sileceğimiz mesaj sayısını gir (1 - 100 arası). Örnek: `!sil 10` 🧹",
      );
    }

    try {
      // Önce kullanıcının yazdığı !sil mesajını siliyoruz ki sayaca dahil olmasın
      await message.delete();

      // Kanaldaki belirtilen miktar kadar mesajı topluca siliyoruz
      const silinenler = await message.channel.bulkDelete(miktar, true);

      // Başarılı mesajı atıp 3 saniye sonra o mesajı da siliyoruz
      const bildirim = await message.channel.send(
        `🧹 **Nuri Baba'nın emriyle ${silinenler.size} adet mesaj duraktan süpürüldü!**`,
      );
      setTimeout(async () => {
        await bildirim.delete().catch(() => {});
      }, 3000);
    } catch (err) {
      console.error(err);
      message.channel.send(
        "Telsiz koptu usta! 14 günden eski mesajları Discord API kuralları gereği topluca silemiyorum veya yetkim eksik.",
      );
    }
  }

  // KULLANICIYI KICKLEME (!kick @kullanıcı <sebep>)
  if (msg.startsWith("!kick")) {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.KickMembers)
    ) {
      return message.reply(
        "Melahat'tan izin almadan kimseyi duraktan kovamazsın usta! Yetkin yok. 🛑",
      );
    }

    const uye = message.mentions.members.first();
    if (!uye)
      return message.reply(
        "Hangi tırnakçıyı duraktan kovuyoruz? Lütfen etiketle: `!kick @kullanıcı` 🚖💨",
      );

    if (!uye.kickable)
      return message.reply(
        "Bu adamın arkası sağlam, gücüm onu duraktan atmaya yetmiyor!",
      );

    const sebep =
      args.slice(2).join(" ") || "Akasya Durağı kurallarına uymamak.";

    await uye
      .kick(sebep)
      .then(() => {
        message.reply(
          `🚖💨 **${uye.user.tag}** isimli şahıs **"${sebep}"** sebebiyle duraktan tekmelendi!`,
        );
      })
      .catch((err) => {
        console.error(err);
        message.reply("Kovarken bir aksilik çıktı usta!");
      });
  }

  // KULLANICIYI BANLAMA (!ban @kullanıcı <sebep>)
  if (msg.startsWith("!ban")) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply(
        "Usman Aga'nın öfkesine sahip değilsin, kimseyi banlayamazsın! Yetkin yetersiz. 🛑",
      );
    }

    const uye = message.mentions.members.first();
    if (!uye)
      return message.reply(
        "Kimi sürgün ediyoruz usta? Lütfen etiketle: `!ban @kullanıcı <sebep>` 🪓",
      );

    if (!uye.bannable)
      return message.reply(
        "Bu eleman bizim Nuri Baba'nın dostu galiba, banlayamıyorum!",
      );

    const sebep = args.slice(2).join(" ") || "Durak düzenini bozmak.";

    await uye
      .ban({ reason: sebep })
      .then(() => {
        message.reply(
          `🚫🪓 **${uye.user.tag}** isimli şahıs **"${sebep}"** sebebiyle duraktan tamamen yasaklandı!`,
        );
      })
      .catch((err) => {
        console.error(err);
        message.reply("Yasaklama işlemi başarısız oldu usta!");
      });
  }
});

// Global error handler
client.on("error", (error) => {
  console.error("Bot hatası:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("İşlem Rejection:", reason);
});

client.login(process.env.TOKEN);
