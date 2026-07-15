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
const FREE_GAMES_CHANNEL_ID = process.env.FREE_GAMES_CHANNEL_ID;
const GENERAL_CHANNEL_ID = process.env.GENERAL_CHANNEL_ID;

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
  const response = await fetch(
    "https://www.gamerpower.com/api/giveaways?type=game&status=active",
  );

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
        .setDescription(
          `${game.description}\n\n**Değeri:** ${game.worth}\n**Bitiş:** ${game.endDate}`,
        )
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

function scheduleDailyTasks() {
  const now = new Date();
  const target = new Date();

  target.setHours(12, 0, 0, 0); // Bugün saat 12:00:00.000

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const msUntilTarget = target.getTime() - now.getTime();
  const minutesLeft = (msUntilTarget / 1000 / 60).toFixed(2);
  console.log(
    `[SCHEDULE] Bir sonraki günlük görevler saat 12:00'da yapılacak. Kalan süre: ${minutesLeft} dakika.`,
  );

  setTimeout(async () => {
    try {
      console.log(
        "[SCHEDULE] Saat 12:00 oldu! Günlük görevler başlatılıyor...",
      );
      await notifyFreeGames(); // Beleş oyunları gönderir
      await notifyMovieCounters(); // Sinema sayaçlarını gönderir
    } catch (error) {
      console.error("Günlük görevler hatası:", error);
    }
    // Sonraki gün için tekrar zamanla
    scheduleDailyTasks();
  }, msUntilTarget);
}

client.once("ready", () => {
  console.log("Akasya Durağı telsizi açıldı, bot hazır!");
  client.user.setActivity("!yardım | Akasya Durağı Telsizi", {
    type: ActivityType.Listening,
  });

  // İki bildirimi de hemen kontrol etmek/başlatmak için
  notifyFreeGames();
  notifyMovieCounters();

  // Zamanlayıcıyı başlatıyoruz
  scheduleDailyTasks();

  console.log(
    `Günlük görev takipçisi aktif. Her gün saat 12:00'da otomatik kontrol edilecek.`,
  );
});

// Atatürk görselleri
const ataturkGorselleri = [
  "https://cdn2.picryl.com/photo/2017/07/11/ataturk1930s-fe7aac-640.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/3/37/Ataturk_in_1923.jpg?utm_source=tr.wikiquote.org&utm_campaign=index&utm_content=original",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUPyGM8UCzkWH3FfJp09Sm9WcOiQ6X_6BZguLaZX9t3SeMNCrJzr5CzghxZeaT0g_frpUV-w6gBIQ2JEomORV9HsEn4DMfU_H6Y66fnA&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRssZMa1XVXflbhle_rLesI7BbTHtsfRh4UKJywacp82SCr8d-3RM5g8Pgs&s=10",
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEUVEvyYWHHP-3Tw6b_XM19VbvTsfTVowM9xbfYnbdhAl-ppZzDRJg1ped&s=10",
  "https://kentkulturuvedemokrasidernegi.com/tema/genel/uploads/sayfalar/ataturk.jpg",
];

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

async function notifyMovieCounters() {
  if (!GENERAL_CHANNEL_ID) {
    return; // Kanal ID'si yoksa iptal et
  }

  try {
    const channel =
      client.channels.cache.get(GENERAL_CHANNEL_ID) ||
      (await client.channels.fetch(GENERAL_CHANNEL_ID).catch(() => null));

    if (!channel?.send) return;

    // Fonksiyonları çağırıp embedleri alıyoruz
    const embedSpidey = getSpidermanEmbed();
    const embedDoom = getDoomsdayEmbed();

    await channel.send({
      content: "🎬 **Akasya Durağı Sinema Kulübü Günlük Hatırlatma!**",
      embeds: [embedSpidey, embedDoom],
    });
    console.log("Günlük sinema sayaçları başarıyla gönderildi.");
  } catch (error) {
    console.error("Günlük sinema sayacı gönderilirken hata:", error);
  }
}

// Spider-Man Embed Üretici
function getSpidermanEmbed() {
  const vizyonTarihi = new Date("2026-07-31T00:00:00+03:00");
  const kalan = kalanSureyiHesapla(vizyonTarihi);

  return new EmbedBuilder()
    .setTitle("🕷️ Spider-Man: Brand New Day Sayacı")
    .setDescription(
      `Tom Holland'ın başrolünde olduğu yeni Örümcek Adam macerasının vizyona girmesine:\n\n${kalan}`,
    )
    .setColor("#E23636")
    .setThumbnail(
      "https://cdn.marvel.com/content/2x/smbnd_online_1400x2100_reflection_03.webp",
    )
    .setFooter({
      text: "Now, his true power awakens. || Akasya Durağı Sinema Kulübü Sunar 🍿",
    })
    .setTimestamp();
}

// Avengers Doomsday Embed Üretici
function getDoomsdayEmbed() {
  const vizyonTarihi = new Date("2026-12-18T00:00:00+03:00");
  const kalan = kalanSureyiHesapla(vizyonTarihi);

  return new EmbedBuilder()
    .setTitle("🟢 Avengers: Doomsday Sayacı")
    .setDescription(
      `Robert Downey Jr.'ın **Doctor Doom** olarak Marvel evrenine döndüğü devasa filmin vizyona girmesine:\n\n${kalan}`,
    )
    .setColor("#107C10")
    .setThumbnail(
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtPueAEpeN2w3Gb1niOB_Gpu1yCaLsWNB2O2UTRs703n1TaoUQixT47zU&s=10",
    )
    .setFooter({
      text: "New mask, same task. || Akasya Durağı Sinema Kulübü Sunar 🍿",
    })
    .setTimestamp();
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();
  const args = message.content.split(" "); // Moderasyon komutları için argümanlar

  // ==========================================
  // 1. GENEL YARDIM MENÜSÜ
  // ==========================================
  if (msg === "!yardım" || msg === "!yardim" || msg === "!komutlar") {
    const yardimMesaji = `
🚕 **AKASYA DURAĞI TELSİZİ - ANA MENÜ** 🚕
Duraktaki tüm güncel komutlar aşağıdadır usta:

🎮 **Ücretsiz Oyun Takibi:**
• \`!free\` veya \`!bedava\` : Tüm platformlardan beleş oyunları listeler.
• \`!epic\` : Epic Games için beleş oyunları gösterir.
• \`!steam\` : Steam için beleş oyunları gösterir.

🎬 **Akasya Durağı Sinema Kulübü:**
• \`!sinema\` veya \`!filmler\` : Aktif tüm vizyon sayaçlarını listeler.
• \`!spiderman\` veya \`!örümcekadam\` : Spider-Man: Brand New Day sayacını gösterir.
• \`!doomsday\` veya \`!avengers\` : Avengers: Doomsday sayacını gösterir.

🚖 **Durak Servisleri & Ekstralar:**
• \`taksi\` veya \`taksi yolla\` : Olduğun ses kanalına girer, taksi sesini çalar ve çıkar.
• \`!atatürk\` : Ulu Önder Mustafa Kemal Atatürk'ün bir fotoğrafını gösterir.

🛠️ **Moderatör (Güvenlik) Komutları:**
• \`!sil <sayı>\` : Belirttiğin miktar kadar mesajı duraktan süpürür. (Örn: \`!sil 10\`)
• \`!kick @kullanıcı <sebep>\` : Kurallara uymayan tırnakçıyı sunucudan tekmeler.
• \`!ban @kullanıcı <sebep>\` : Sıkıntı çıkaranı duraktan ömür boyu sürgün eder.

*Akasya Durağı her zaman 10 numara hizmet verir! Hayırlı işler usta!* 🚖
    `;
    return message.reply(yardimMesaji);
  }

  if (
    msg === "!free" ||
    msg === "!free check" ||
    msg === "!beles" ||
    msg === "!bedava"
  ) {
    try {
      const games = await fetchFreeGames();
      if (games.length === 0) {
        return message.reply("😔 Şu an beleş oyun yok usta.");
      }

      const embeds = games.slice(0, 5).map((game) => {
        const embed = new EmbedBuilder()
          .setTitle(`🎁 ${game.title}`)
          .setDescription(
            `${game.description}\n\n**Değeri:** ${game.worth}\n**Bitiş:** ${game.endDate}`,
          )
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
      const filtered = games
        .filter((g) => g.source === "gamerpower")
        .slice(0, 5);
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

  if (msg === "!spiderman" || msg === "!spiderman4" || msg === "!örümcekadam") {
    try {
      return message.reply({ embeds: [getSpidermanEmbed()] });
    } catch (err) {
      return message.reply("Embed yetkim yetmiyor usta! Rolümü kontrol et.");
    }
  }

  if (msg === "!doomsday" || msg === "!avengers" || msg === "!kıyamet") {
    try {
      return message.reply({ embeds: [getDoomsdayEmbed()] });
    } catch (err) {
      return message.reply("Embed yetkim yetmiyor usta! Rolümü kontrol et.");
    }
  }

  // YENİ EKLENTİ: İkisini birden çağırmak isterseniz diye
  if (msg === "!sinema" || msg === "!filmler") {
    try {
      return message.reply({
        content: "🎬 **Akasya Durağı Sinema Kulübü Aktif Vizyon Listesi:**",
        embeds: [getSpidermanEmbed(), getDoomsdayEmbed()],
      });
    } catch (err) {
      return message.reply("Embed yetkim yetmiyor usta! Rolümü kontrol et.");
    }
  }

  // ==========================================
  // 2. MİZAHİ & EĞLENCE KOMUTLARI (ZİBİLYON TANE)
  // ==========================================

  if (msg === "!atatürk" || msg === "!ataturk") {
    const rastgeleGorsel =
      ataturkGorselleri[Math.floor(Math.random() * ataturkGorselleri.length)];

    const embed = new EmbedBuilder()
      .setTitle("🇹🇷 Mustafa Kemal Atatürk")
      .setDescription("Türkiye Cumhuriyeti'nin kurucusu")
      .setImage(rastgeleGorsel)
      .setColor("#CE0E2D") // Türk bayrağı kırmızısı
      .setFooter({
        text: '"Bir millet yeniden dirilişe, terakkiye, medeniyete gidecek yolu kaybetmiş olsa bile, başında bir rehber bulması halinde, bütün engelleri aşarak; yeniden istikbale doğru koşar." - Atatürk',
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
  if (msg === "sa") {
    return message.reply("Aleyküm selam uşağım! Nasılsın? 🚖");
  }

  if (msg === "naber" || msg === "ne haber") {
    return message.reply("İyi usta, taksi çağıran var mı? 🚖");
  }

  if (
    msg === "!demokratikkongo" ||
    msg === "!demokratik kongo" ||
    msg === "!kongo"
  ) {
    return (embed = new EmbedBuilder()
      .setTitle("🇨🇩 Demokratik Kongo Cumhuriyeti")
      .setDescription("Bu İş Devrime Gidiyor")
      .setImage(
        "https://images-ext-1.discordapp.net/external/iiQD_r5lYBZqyC068bxTnc4133z3Yy8X0_wm3lfv5Dk/https/static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/10/be/SexXycuQmsfo.mp4",
      )
      .setColor("#0da8ca") // Türk bayrağı kırmızısı
      .setTimestamp());
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
  // 4. RASTGELE TAKIM BÖLME KOMUTU (!takım)
  // ==========================================

  if (msg === "!takım" || msg === "!takim" || msg === "!vs") {
    // 1. Kullanıcının bir ses kanalında olup olmadığını kontrol et
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply(
        "Usta, takımları bölmek için önce bir ses kanalına girmen lazım! Telsizden kura çekemeyiz. 🎙️",
      );
    }

    // 2. Ses kanalındaki üyeleri al ve BOTLARI FİLTRELE
    // Sadece gerçek kullanıcıların sunucudaki isimlerini (displayName) bir diziye ekliyoruz
    const gercekUyeler = voiceChannel.members
      .filter((member) => !member.user.bot)
      .map((member) => member.displayName);

    // 3. Yeterli kişi var mı kontrolü
    if (gercekUyeler.length < 2) {
      return message.reply(
        "Usta seste tek başınasın (veya sadece botlar var). Kendi kendinle mi kapışacaksın? 🚖",
      );
    }

    // 4. Üyeleri Rastgele Karıştır (Fisher-Yates Shuffle algoritması)
    for (let i = gercekUyeler.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gercekUyeler[i], gercekUyeler[j]] = [gercekUyeler[j], gercekUyeler[i]];
    }

    // 5. Takımları İkiye Böl
    const yari = Math.ceil(gercekUyeler.length / 2);
    const takim1 = gercekUyeler.slice(0, yari);
    const takim2 = gercekUyeler.slice(yari);

    // 6. Şık bir mesaj (Embed) ile sonucu göster
    const takimEmbed = new EmbedBuilder()
      .setTitle("⚔️ Akasya Durağı Kapışması Başlıyor!")
      .setDescription(
        "Müzik botları çöpe atıldı, kalan aslanlar rastgele iki takıma bölündü. Gazanız mübarek olsun!",
      )
      .setColor("#FF8C00") // Turuncu renk
      .addFields(
        {
          name: "🔴 1. Takım (Usman Aga'nın Aslanları)",
          value:
            takim1.map((isim) => `• **${isim}**`).join("\\n") || "Kimse yok",
          inline: true,
        },
        {
          name: "🔵 2. Takım (Nuri Baba'nın Yiğitleri)",
          value:
            takim2.map((isim) => `• **${isim}**`).join("\\n") || "Kimse yok",
          inline: true,
        },
      )
      .setFooter({
        text: "Hile yapanı, takıma itiraz edeni duraktan kovarım! 🚖",
      })
      .setTimestamp();

    return message.reply({ embeds: [takimEmbed] });
  }

  // ==========================================
  // 5. MODERASYON (GÜVENLİK) SİSTEMİ
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
