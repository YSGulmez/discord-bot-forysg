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
// Aternos ve Minecraft takibi devre dışı bırakıldı

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

async function fetchFreeGames() {
  console.log("[DEBUG] GamerPower API çağrılıyor...");
  const response = await fetch("https://www.gamerpower.com/api/giveaways?type=game&status=active");

  if (!response.ok) {
    console.error(`[ERROR] GamerPower API hatası: ${response.status}`);
    throw new Error(`GamerPower API hatası: ${response.status}`);
  }

  const data = await response.json();
  console.log("[DEBUG] GamerPower raw giveaways sayısı:", data?.length);
  
  // İlk 10 beleş oyunu döndür
  return (data || []).slice(0, 10).map((game) => ({
    title: game.title || "Bilinmeyen Oyun",
    description: game.description || "Ücretsiz oyun!",
    image: game.image || "",
    link: game.open_giveaway_url || "",
    source: "gamerpower",
    worth: game.worth || "Fiyat bilinmiyor",
    endDate: game.end_date || "Bilinmiyor",
  }));
}

async function notifyFreeGames() {
  if (!FREE_GAMES_CHANNEL_ID) {
    return;
  }

  try {
    const state = loadFreeGamesState();
    const freeGames = await fetchFreeGames();
    const newGames = freeGames.filter(
      (game) => !state.lastNotified.includes(game.title),
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
        .setTitle(`🎁 ${game.title}`)
        .setDescription(`${game.description}\n\n**Değeri:** ${game.worth}\n**Bitiş:** ${game.endDate}`)
        .setColor("#FF6B6B")
        .setTimestamp();

      if (game.image) {
        embed.setImage(game.image);
      }

      if (game.link) {
        embed.setURL(game.link);
      }

      await channel.send({ embeds: [embed] });
      state.lastNotified.push(game.title);
    }

    saveFreeGamesState(state);
    console.log(`${newGames.length} yeni ücretsiz oyun bildirimi gönderildi.`);
  } catch (error) {
    console.error("Ücretsiz oyun takip hatası:", error);
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

 **Ücretsiz Oyun Takibi (GamerPower):**
• \`!free\` : Tüm platformlardan beleş oyunları listeler.
• \`!epic\` : Beleş oyunları gösterir (Epic Games için uyarlanmış).
• \`!steam\` : Beleş oyunları gösterir (Steam için uyarlanmış).
• \`!beles\` veya \`!bedava\` : Kısayol komutlar.

🛠️ **Moderatör (Güvenlik) Komutları:**
• \`!sil <sayı>\` : Belirttiğin miktar kadar mesajı anında süpürür. (Örn: \`!sil 10\`)
• \`!kick @kullanıcı <sebep>\` : Kurallara uymayan tırnakçıyı sunucudan tekmeler.
• \`!ban @kullanıcı <sebep>\` : Sıkıntı çıkaranı duraktan ömür boyu sürgün eder.

*Akasya Durağı her zaman 10 numara hizmet verir!* 🚖
        `;
    return message.reply(yardimMesaji);
  }

  if (msg === "!free" || msg === "!free check" || msg === "!beles" || msg === "!bedava") {
    try {
      const games = await fetchFreeGames();
      if (games.length === 0) {
        return message.reply("😔 Şu an beleş oyun yok usta.");
      }

      const embeds = games.slice(0, 5).map((game) => {
        const embed = new EmbedBuilder()
          .setTitle(`🎁 ${game.title}`)
          .setDescription(`${game.description}\n\n**Değeri:** ${game.worth}\n**Bitiş:** ${game.endDate}`)
          .setColor("#FF6B6B")
          .setTimestamp();
        if (game.image) embed.setImage(game.image);
        if (game.link) embed.setURL(game.link);
        return embed;
      });

      for (const embed of embeds) {
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("!free komut hatası:", error);
      return message.reply("❌ Beleş oyun verisi alınamadı.");
    }
  }

  if (msg === "!epic") {
    try {
      const games = await fetchFreeGames();
      const filtered = games.filter(g => g.source === "gamerpower").slice(0, 5);
      if (filtered.length === 0) {
        return message.reply("😔 Şu an beleş oyun yok.");
      }
      for (const game of filtered) {
        const embed = new EmbedBuilder()
          .setTitle(`🎁 ${game.title}`)
          .setDescription(game.description)
          .setColor("#FF6B6B")
          .setURL(game.link)
          .setTimestamp();
        if (game.image) embed.setImage(game.image);
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("!epic komut hatası:", error);
      return message.reply("❌ Beleş oyun verisi alınamadı.");
    }
  }

  if (msg === "!steam") {
    try {
      const games = await fetchFreeGames();
      const filtered = games.slice(0, 5);
      if (filtered.length === 0) {
        return message.reply("😔 Şu an beleş oyun yok.");
      }
      for (const game of filtered) {
        const embed = new EmbedBuilder()
          .setTitle(`🎁 ${game.title}`)
          .setDescription(game.description)
          .setColor("#FF6B6B")
          .setURL(game.link)
          .setTimestamp();
        if (game.image) embed.setImage(game.image);
        await message.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error("!steam komut hatası:", error);
      return message.reply("❌ Beleş oyun verisi alınamadı.");
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
