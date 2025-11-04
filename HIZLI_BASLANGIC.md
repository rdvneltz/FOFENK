# 🚀 Hızlı Başlangıç Kılavuzu

## Git Desktop ile GitHub'a Push

### 1. Git Desktop'ta Commit
1. **Git Desktop**'ı aç
2. Sol üstte **"FOFENK"** repository'si seçili olmalı
3. Sol panelde **tüm değişiklikleri** göreceksin
4. Sol altta **"Summary"** kısmına şunu yaz:
   ```
   İlk commit - Fofora Tiyatro Yönetim Sistemi
   ```
5. **Description** (isteğe bağlı):
   ```
   ✅ Öğrenci, ders, ödeme yönetimi
   ✅ Dashboard ve raporlama
   ✅ Excel export, Email gönderimi
   ✅ Otomatik yedekleme ve grafik
   ✅ Otomatik ders programı
   ```
6. **"Commit to main"** butonuna tıkla
7. Üstteki **"Push origin"** butonuna tıkla

✅ Artık kodların GitHub'da!

---

## Ücretsiz Hosting (Render.com)

### ADIM 1: MongoDB Atlas

1. https://www.mongodb.com/cloud/atlas/register
2. **Ücretsiz hesap** oluştur
3. **"Build a Database"** → **"FREE" (M0)** → **"Create"**
4. Provider: AWS, Region: Frankfurt
5. **Username/Password** oluştur ve **KAYDET!**
6. **Network Access** → **"Allow Access from Anywhere"** (0.0.0.0/0)
7. **Connect** → **"Connect your application"** → **Connection string'i kopyala**

**Connection String Formatı:**
```
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/fofora-theatre?retryWrites=true&w=majority
```

---

### ADIM 2: Gmail App Password (Email için)

1. https://myaccount.google.com/apppasswords
2. **"Select app"** → **"Mail"**
3. **"Select device"** → **"Other"** → **"Fofora Theatre"**
4. **"Generate"**
5. 16 haneli şifreyi **KAYDET!**

---

### ADIM 3: Render.com'da Backend Deploy

1. https://render.com → **GitHub ile giriş yap**
2. **"New +"** → **"Web Service"**
3. **"fofenk"** repository'sini seç → **"Connect"**

**Ayarlar:**
```
Name: fofora-backend
Region: Frankfurt
Branch: main
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: FREE
```

**Environment Variables:** (Advanced → Add Environment Variable)
```
NODE_ENV=production
PORT=5000
MONGODB_URI=<MongoDB connection string buraya>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<gmail adresin>
SMTP_PASS=<gmail app password>
EMAIL_FROM=Fofora Tiyatro <noreply@fofora.com>
```

**"Create Web Service"** → 5-10 dakika bekle

Backend URL'ini kaydet: `https://fofora-backend.onrender.com`

---

### ADIM 4: Render.com'da Frontend Deploy

1. **"New +"** → **"Static Site"**
2. **"fofenk"** repository'sini seç

**Ayarlar:**
```
Name: fofora-frontend
Region: Frankfurt
Branch: main
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: build
```

**Environment Variables:**
```
REACT_APP_API_URL=https://fofora-backend.onrender.com/api
```

**"Create Static Site"** → 5-10 dakika bekle

Frontend URL'ini kaydet: `https://fofora-frontend.onrender.com`

---

### ADIM 5: Backend CORS Ayarı

1. **Masaüstünde** → **FOFENK/server/server.js** dosyasını aç
2. **13. satırdaki** `app.use(cors());` satırını bul
3. Şununla değiştir:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://fofora-frontend.onrender.com' // Kendi frontend URL'in
  ],
  credentials: true
}));
```

4. **Git Desktop'ta commit** ve **push** et
5. Render otomatik deploy edecek

---

### ADIM 6: Test Et!

1. **Frontend'e git:** https://fofora-frontend.onrender.com

2. **İlk kurulum:**
   - Kurum Profili → Fofora Tiyatro
   - Sezon → 2025-2026
   - Kullanıcı → Admin
   - Kasa → Ana Kasa

3. **Sistemi kullanmaya başla!** 🎭

---

## ⚠️ Önemli Notlar

### Sleep Mode (15 dk inaktivite)
Render FREE plan'da backend 15 dakika kullanılmazsa uyur.
İlk istek ~30 saniye sürer.

**Çözüm:** UptimeRobot (ücretsiz)
1. https://uptimerobot.com → Hesap aç
2. Backend URL'ini ekle
3. Her 5 dakikada ping at

---

## 🆘 Sorun mu var?

### MongoDB'ye bağlanamıyorum
- ✅ Connection string doğru mu?
- ✅ Şifre özel karakter içeriyorsa `%40` gibi encode edilmeli
- ✅ IP Whitelist: 0.0.0.0/0 var mı?

### Frontend API'ye ulaşamıyor
- ✅ CORS ayarı yaptın mı?
- ✅ Backend'in URL'i doğru mu?
- ✅ Environment variables eklendi mi?

### Email gönderilmiyor
- ✅ Gmail App Password kullanıyor musun?
- ✅ 2-Step Verification açık mı?

---

## ✅ Deployment Checklist

- [ ] GitHub'a push edildi
- [ ] MongoDB Atlas kuruldu
- [ ] Gmail App Password alındı
- [ ] Backend deploy edildi
- [ ] Frontend deploy edildi
- [ ] Environment variables eklendi
- [ ] CORS ayarı yapıldı
- [ ] Test edildi

---

## 🎉 Tebrikler!

Sisteminiz canlıda!

**Frontend:** https://fofora-frontend.onrender.com
**Backend:** https://fofora-backend.onrender.com

Artık her yerden erişebilirsin! 🚀
