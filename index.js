const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Akasya Durağı 7/24 Aktif usta!');
});

app.listen(port, () => {
    console.log(`Web sunucusu ${port} portunda.`);
});

// --- DİSCORD BOT KODLARI ---
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Ses kanallarını görebilmesi için şart
    ]
});

client.once('ready', () => {
    console.log('Akasya Durağı telsizi açıldı, bot hazır!');
});

// Akasya Durağı replikleri havuzu
const replikler = [
    "Ooo tırnakçı kardeş, naber ya? - Sinan Kaya",
    "Bana bak Sinan, yine ne haltlar karıştırıyorsun ulan! - Melahat",
    "Oy kuymak kafalım benim, uyyy! - Temel",
    "Ulan Sinan, senin yüzünden yine karakolluk olduk! - Usman Aga",
    "Cezmi bey, tırnakçılara dikkat edelim lütfen. - Mazhar Bey",
    "Seyit kardeş, memleketten tereyağ getirdin mi da? - Temel"
];

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const msg = message.content.toLowerCase();

    // 1. MİZAHİ KOMUTLAR
    if (msg === 'sinan' || msg === 'sinan kaya') {
        message.reply("Kardeş bittim ben, bittim! Melahat eve almadı, takside yatıyorum usta! 🚕");
    }

    if (msg === 'usman aga') {
        message.reply("Ulan Sinan, vurucam seni ha! Trakya kızanıyım ben, şaka mika istemem be ya! 🪓");
    }

    if (msg === '!replik') {
        const rastgeleReplik = replikler[Math.floor(Math.random() * replikler.length)];
        message.reply(rastgeleReplik);
    }

    // 2. SES KANALINA GİRİP TAKSİ YOLLAMA KOMUTU
    if (msg === 'taksi' || msg === 'taksi çağır' || msg === 'taksi yolla') {
        // Kullanıcının ses kanalında olup olmadığını kontrol et
        const voiceChannel = message.member.voice.channel;
        
        if (!voiceChannel) {
            return message.reply("Usta önce bir ses kanalına gir be ya, taksiyi göğe mi yollayayım?");
        }

        try {
            message.reply("Anlaşıldı merkez, Akasya Durağından bir taksi yolluyorum! 🚖");

            // Ses kanalına bağlan
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            // NOT: Ses dosyası oynatmak istersen buraya ekleyebilirsin.
            // Şimdilik kanala girip 4 saniye bekleyip çıkacak şekilde ayarlayalım:
            
            setTimeout(() => {
                connection.destroy(); // Kanaldan çıkış yapar
                message.channel.send("Taksi adrese ulaştı, müşteri alındı usta! Çıkıyorum.");
            }, 4000); // 4000 milisaniye = 4 saniye durur

        } catch (error) {
            console.error(error);
            message.reply("Taksi yolda kaza yaptı usta, gelemedi! (Ses hatası oluştu)");
        }
    }
});

client.login(process.env.TOKEN);