# 🚕 Akasya Durağı Telsizi - Discord Bot

Discord.js v14 ile yazılmış, "Akasya Durağı" temalı eğlence ve moderasyon botu.

## ✨ Özellikler

### 🎮 Ücretsiz Oyun Takibi
- **Epic Games Store** ücretsiz oyunlarını otomatik takip eder
- **Steam** ücretsiz/indirimli oyunları kontrol eder
- Yeni ücretsiz oyun çıktığında belirlenen kanala embed ile bildirim gönderir
- Durum `free-games-state.json` dosyasında saklanır (tekrar bildirim yapmaz)

### 🧱 Minecraft / Aternos Entegrasyonu
- Sunucu durumu takibi (mcsrvstat.us API)
- Aternos sunucusu başlatma/durdurma komutları
- Sunucu açılıp kapanınca otomatik bildirim

### 🎬 Marvel Film Sayaçları
- Spider-Man: Brand New Day (31 Temmuz 2026)
- Avengers: Doomsday (18 Aralık 2026)

### 🎭 Eğlence Komutları
- Karakter replikleri (Sinan Kaya, Usman Ağa, Nuri Baba, Arif, Temel)
- Rastgele replik (`!replik`)
- Ses kanalına girip "Taksi" ses efekti çalarak çıkar (`taksi`)

### 🛡️ Moderasyon
- `!sil <sayı>` - Mesaj toplu silme (1-100)
- `!kick @kullanıcı <sebep>` - Kullanıcıyı sunucudan atma
- `!ban @kullanıcı <sebep>` - Kullanıcıyı yasaklama

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Environment Variables
`.env.example` dosyasını kopyalayıp `.env` olarak kaydedin ve değerleri doldurun:

```bash
cp .env.example .env
```

**Gerekli Değişkenler:**
| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `DISCORD_TOKEN` | Discord Bot Token (Developer Portal) | ✅ Evet |
| `FREE_GAMES_CHANNEL_ID` | Ücretsiz oyun bildirimleri için kanal ID | ✅ Evet |
| `MC_SERVER_HOST` | Minecraft sunucu adresi (örn: `sunucu.aternos.me`) | Aternos için |
| `MC_SERVER_CHANNEL_ID` | MC durum bildirimleri için kanal ID | Aternos için |
| `ATERNOS_SERVER_ID` | Aternos sunucu ID (URL'den alınır) | Aternos start/stop için |
| `ATERNOS_SESSION_COOKIE` | Aternos oturum cookie'si (tarayıcıdan) | Aternos start/stop için |

### 3. Aternos Cookie Alma (Start/Stop için)
1. Tarayıcıda [aternos.org](https://aternos.org) giriş yapın
2. F12 → Network sekmesi
3. Herhangi bir istek yapın (sayfa yenileyin)
4. Bir isteğe tıklayın → Headers → **Cookie** değerini kopyalayın
5. `.env` dosyasına `ATERNOS_SESSION_COOKIE=` olarak yapıştırın

### 4. Botu Başlat
```bash
# Development
node index.js

# Production (PM2 önerilir)
pm2 start index.js --name "akasya-bot"
```

## 📦 Render.com'a Deploy (7/24 Çalışan)

### Adım 1️⃣: GitHub'a Push Yap
```bash
git add .
git commit -m "Akasya Durağı botu hazır"
git push origin main
```

### Adım 2️⃣: Render'a Bağla
1. https://dashboard.render.com adresine gir
2. **New +** → **Web Service** seçin
3. **GitHub** seç → Repo'nu seç ve bağla
4. Ayarlar:
   - **Name:** `akasya-duragi-bot` (dilediğin isim)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (yeterli) - Premium'a yükseltebilirsin

### Adım 3️⃣: Environment Variables Ekle ⭐ ÖNEMLİ
1. Render Dashboard'ında botunun sayfası açık durumda
2. **Environment** sekmesine tıkla
3. Aşağıdaki değerleri teker teker **"Add Environment Variable"** ile ekle:

#### ✅ **ZORUNLU** (Bunlar olmadan bot çalışmaz)

| Değişken | Değer | Nereden Bulacaksın |
|----------|-------|-------------------|
| `TOKEN` | `your_bot_token` | 1. Discord'a git → https://discord.com/developers/applications<br/>2. Botu seç (yoksa "New Application" yap)<br/>3. "Bot" sekmesi → "Reset Token" → **Kopyala** |
| `FREE_GAMES_CHANNEL_ID` | `123456789012345678` | Discord'da oyun bildirimlerini göndermek istediğin kanala **SAĞ TIK** → **Copy Channel ID** |

#### 🎮 **Minecraft/Aternos Takibi** (İsteğe bağlı)

| Değişken | Değer | Nereden Bulacaksın |
|----------|-------|-------------------|
| `MC_SERVER_HOST` | `your_server.aternos.me` | Aternos sunucu URL'sinden (Örn: https://aternos.org/server/akasya_duragi/ → `akasya_duragi.aternos.me`) |
| `MC_SERVER_CHANNEL_ID` | `123456789012345678` | Discord kanalı ID (yukarıdaki gibi SAĞ TIK → Copy Channel ID) |

#### ⚡ **Aternos Start/Stop Komutları** (İsteğe bağlı - !aternos start/stop için)

| Değişken | Değer | Nereden Bulacaksın |
|----------|-------|-------------------|
| `ATERNOS_SERVER_ID` | `abc123def456` | Aternos URL'nde: https://aternos.org/server/**abc123def456**/ |
| `ATERNOS_SESSION_COOKIE` | `ATERNOS_SESSION=...` | **ADIM ADIM:** <br/>1. Tarayıcıda aternos.org'a giriş yap<br/>2. **F12** tuşu (Developer Tools)<br/>3. **Network** sekmesi → Sayfa yenile (F5)<br/>4. Bir istek tıkla → **Headers**<br/>5. "Request Headers" bölümünde "Cookie:" satırını bul<br/>6. **ATERNOS_SESSION=...** den başlayan TÜM değeri KOPYALa<br/>7. Render'a yapıştır |

### Adım 4️⃣: Deploy Et
1. Tüm environment değişkenlerini girdikten sonra
2. **Deploy** butonuna tıkla
3. Render otomatik olarak build eder ve başlatır ✨

### Adım 5️⃣: Kontrol Et
1. Render Dashboard'da botunun sayfasında **"Active"** yazması gerekir
2. Logları görmek için **"Logs"** sekmesine tıkla
3. Bot başarıyla başladıysa şöyle bir mesaj görürsün:
```
Web sunucusu 3000 portunda.
Akasya Durağı telsizi açıldı, bot hazır!
```

---

## 💻 Yerel Geliştirme (Kendi Bilgisayarında Test)

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. .env Dosyası Oluştur
```bash
cp .env.example .env
```

### 3. .env Dosyasını Doldur
`.env` dosyasını açıp aşağıdaki değerleri doldur:
- `TOKEN=` (Discord Bot Token)
- `FREE_GAMES_CHANNEL_ID=` (Kanal ID)
- Diğerleri isteğe bağlı

### 4. Botu Çalıştır
```bash
npm start
```

Veya watch mode (otomatik restart):
```bash
npm run dev
```

---

## 📁 Proje Yapısı
```
├── index.js                 # Ana bot dosyası
├── package.json             # Bağımlılıklar
├── .env.example             # Environment şablonu
├── .gitignore               # Git ignore
├── free-games-state.json    # Oyun takip durumu (otomatik oluşur)
├── Sounds/
│   └── Taksi.mp3            # Taksi ses efekti
└── Image/                   # Görseller (opsiyonel)
```

## 🤖 Komutlar

| Komut | Açıklama |
|-------|----------|
| `!yardım` / `!komutlar` | Tüm komutları listeler |
| `!free` | Ücretsiz oyun kontrolünü manuel tetikler |
| `!epic` | Epic Games ücretsiz oyunları gösterir |
| `!steam` | Steam indirimli/ücretsiz oyunları gösterir |
| `!aternos` / `!mc` | Minecraft sunucu durumu |
| `!aternos start` | Aternos sunucusunu başlatır |
| `!aternos stop` | Aternos sunucusunu durdurur |
| `!spiderman` / `!spiderman4` | Spider-Man 4 sayacı |
| `!doomsday` / `!avengers` | Avengers: Doomsday sayacı |
| `!replik` | Rastgele karakter repliği |
| `taksi` / `taksi çağır` | Ses kanalına girip ses çalar |
| `!sil <1-100>` | Mesaj silme (Mod) |
| `!kick @user <sebep>` | Kullanıcı atma (Mod) |
| `!ban @user <sebep>` | Kullanıcı yasaklama (Mod) |

## 🔧 Teknolojiler
- **discord.js** v14 - Discord API
- **@discordjs/voice** - Ses kanalı işlemleri
- **express** - Web sunucusu (Render health check için)
- **node-fetch** (native) - API istekleri

## 📝 Lisans
MIT License - İstediğiniz gibi kullanın, değiştirin, dağıtın.

---

*Akasya Durağı her zaman 10 numara hizmet verir!* 🚖