const express = require("express");
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
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const path = require("path");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers, // Moderasyon işlemleri (ban/kick) için şart
  ],
});

client.once("ready", () => {
  console.log("Akasya Durağı telsizi açıldı, bot hazır!");

  // Botun durum/aktivite açıklamasını ayarlıyoruz
  client.user.setActivity("!yardım | Akasya Durağı Telsizi", {
    type: ActivityType.Listening,
  });
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

🛠️ **Moderatör (Güvenlik) Komutları:**
• \`!sil <sayı>\` : Belirttiğin miktar kadar mesajı anında süpürür. (Örn: \`!sil 10\`)
• \`!kick @kullanıcı <sebep>\` : Kurallara uymayan tırnakçıyı sunucudan tekmeler.
• \`!ban @kullanıcı <sebep>\` : Sıkıntı çıkaranı duraktan ömür boyu sürgün eder.

*Akasya Durağı her zaman 10 numara hizmet verir!* 🚖
        `;
    return message.reply(yardimMesaji);
  }

  // ==========================================
  // 2. MİZAHİ & EĞLENCE KOMUTLARI (ZİBİLYON TANE)
  // ==========================================
  if (msg === "sinan" || msg === "sinan kaya" || msg === "sinankaya") {
    message.reply(
      "Kardeş bittim ben, bittim! Melahat eve almadı, takside yatıyorum usta! 🚕 Kaynanam da yine büyü yaptırmış kesin!",
    );
  }

  if (msg === "usman aga" || msg === "usmanaga") {
    message.reply(
      "Ulan Sinan, vurucam seni ha! Trakya kızanıyım ben, şaka mika istemem be ya! Alıcam baltayı elime şimdi! 🪓",
    );
  }

  if (msg === "nuri baba" || msg === "nuribaba") {
    message.reply(
      "Evlatlarım, benim canım şoförlerim... Durakta kavga istemiyorum. Herkes ekmeğinin peşinde koşsun! 👨‍✈️☕",
    );
  }

  if (msg === "arif" || msg === "arif ışık") {
    message.reply(
      "Usta, şair ne güzel demiş: 'Yollar uzun, hayat kısa, bir taksi çağır Akasya'dan gelmezse dert etme tasa...' 🚖✍️",
    );
  }

  if (msg === "temel") {
    message.reply(
      "Uyyy kuymak kafalım benum! Ha pen şimdi siza Trabzon'dan taze hamsi getireceğum da! 🐟",
    );
  }

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

client.login(process.env.TOKEN);
