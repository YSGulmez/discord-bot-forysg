// Ücretsiz Render (Web Service) için basit bir web sunucusu ekliyoruz
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot aktif ve çalışıyor usta!');
});

app.listen(port, () => {
    console.log(`Web sunucusu ${port} portunda başlatıldı.`);
});

//Dc bot
const { Client, GatewayIntentBits } = require('discord.js');

// Botun kullanacağı yetkileri (Intents) tanımlıyoruz
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Bot hazır olduğunda konsola yazdıracak
client.once('ready', () => {
    console.log(`Bot başarıyla giriş yaptı! Aktif isim: ${client.user.tag}`);
});

// Mesajları dinleme ve cevap verme
client.on('messageCreate', (message) => {
    // Eğer mesajı yazan bir botsa, sonsuz döngüye girmemek için görmezden gel
    if (message.author.bot) return;

    // Basit bir "sa" - "as" komutu
    if (message.content.toLowerCase() === 'sa') {
        message.reply('Aleyküm Selam, hoş geldin! usta');
    }

    // Ping komutu
    if (message.content.toLowerCase() === '!ping') {
        message.reply('Pong! 🏓');
    }
	
	if (message.content.toLowerCase() === 'naber'){
		message.reply('Taksi Lazımdır Ağbey');
	}
});

// Developer Portal'dan aldığın Token'ı buraya yapıştır
// Tokenı çevre değişkeninden çekecek hale getiriyoruz
client.login(process.env.TOKEN);
