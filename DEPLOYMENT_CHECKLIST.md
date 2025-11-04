# 🚀 Deployment Kontrol Listesi

## ✅ ADIM 1: Git Desktop'tan Push Et

1. **Git Desktop'ı aç**
2. Sol panelde tüm değişiklikleri göreceksin
3. **Summary** (zorunlu):
   ```
   feat: Fofora Tiyatro Yönetim Sistemi - Tamamlandı
   ```

4. **Description** (isteğe bağlı):
   ```
   ✅ Öğrenci, ders, ödeme yönetimi
   ✅ Dashboard ve detaylı raporlama
   ✅ Excel export ve Email gönderimi
   ✅ Otomatik yedekleme sistemi
   ✅ Chart.js grafikleri
   ✅ Otomatik ders programı oluşturma
   ✅ Kullanıcı ve aktivite takibi
   ✅ 24+ özellik, production-ready
   ```

5. **"Commit to main"** butonuna bas
6. **"Push origin"** butonuna bas

✅ **GitHub'da kodların artık hazır!**

---

## ✅ ADIM 2: Render.com'a Kaydol

1. https://render.com adresine git
2. **"Get Started for Free"** tıkla
3. **"Sign in with GitHub"** ile giriş yap
4. GitHub'da Render'a erişim izni ver

✅ **Render hesabın hazır!**

---

## ✅ ADIM 3: Backend Deploy

### 3.1 Web Service Oluştur
1. Render Dashboard → **"New +"** → **"Web Service"**
2. **"Connect a repository"** → **"fofenk"** seç → **"Connect"**

### 3.2 Ayarları Yap
```
Name: fofora-backend
Region: Frankfurt (EU Central)
Branch: main
Root Directory: server
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

### 3.3 Environment Variables Ekle
**"Advanced"** → **"Add Environment Variable"**

**RENDER_ENV_VARIABLES.txt dosyasını aç ve şunları tek tek ekle:**

| Key | Value |
|-----|-------|
| NODE_ENV | production |
| PORT | 5000 |
| MONGODB_URI | mongodb+srv://fofenk_db:fofenkfofenk@fofenk.rfztasq.mongodb.net/fofora-theatre?retryWrites=true&w=majority |
| SMTP_HOST | smtp.gmail.com |
| SMTP_PORT | 587 |
| SMTP_SECURE | false |
| SMTP_USER | **BURAYA SENİN GMAİL ADRESİNİ YAZ** |
| SMTP_PASS | yavxhigqsfvsswjh |
| EMAIL_FROM | Fofora Tiyatro <noreply@fofora.com> |

### 3.4 Deploy Et
**"Create Web Service"** → Deploy başlayacak (5-10 dakika)

### 3.5 URL'i Kaydet
Deploy bitince üstte URL göreceksin:
```
https://fofora-backend-xxxx.onrender.com
```
**BU URL'İ KAYDET! Frontend'de lazım olacak.**

✅ **Backend canlıda!**

---

## ✅ ADIM 4: Frontend Deploy

### 4.1 Static Site Oluştur
1. Render Dashboard → **"New +"** → **"Static Site"**
2. **"fofenk"** repository'sini seç → **"Connect"**

### 4.2 Ayarları Yap
```
Name: fofora-frontend
Region: Frankfurt (EU Central)
Branch: main
Root Directory: client
Build Command: npm install && npm run build
Publish Directory: build
```

### 4.3 Environment Variables Ekle
**"Advanced"** → **"Add Environment Variable"**

| Key | Value |
|-----|-------|
| REACT_APP_API_URL | https://SENİN-BACKEND-URLIN/api |

**ÖRNEK:**
```
REACT_APP_API_URL=https://fofora-backend-abc123.onrender.com/api
```

⚠️ **Dikkat:** Backend URL'ini kopyalarken sonuna **/api** eklemeyi unutma!

### 4.4 Deploy Et
**"Create Static Site"** → Deploy başlayacak (5-10 dakika)

✅ **Frontend canlıda!**

---

## ✅ ADIM 5: Backend'de CORS Ayarı

### 5.1 Dosyayı Aç
Masaüstünde → **FOFENK/server/server.js**

### 5.2 12-13. Satırları Bul
```javascript
app.use(cors());
```

### 5.3 Şununla Değiştir
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://SENIN-FRONTEND-URLIN.onrender.com' // Frontend URL'ini buraya
  ],
  credentials: true
}));
```

**ÖRNEK:**
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://fofora-frontend-xyz789.onrender.com'
  ],
  credentials: true
}));
```

### 5.4 Git Desktop'tan Push Et
1. Git Desktop'ı aç
2. Summary: `fix: CORS ayarı eklendi`
3. Commit → Push

✅ Render otomatik yeniden deploy edecek (2-3 dakika)

---

## ✅ ADIM 6: Test Et!

### 6.1 Frontend'e Git
```
https://senin-frontend-urlin.onrender.com
```

### 6.2 İlk Kurulum
1. **Kurum Profili Oluştur:**
   - Ad: Fofora Tiyatro
   - Diğer bilgileri doldur

2. **Sezon Oluştur:**
   - Ad: 2025-2026
   - Başlangıç: 01.09.2025
   - Bitiş: 30.06.2026

3. **Kullanıcı Oluştur:**
   - Header'daki "Kullanıcı Yönetimi"nden
   - İlk admin kullanıcını oluştur

4. **Kasa Oluştur:**
   - Kasalar menüsünden
   - Ana Kasa oluştur

### 6.3 Test İşlemleri
- ✅ Öğrenci ekle
- ✅ Ders oluştur
- ✅ Öğrenciyi derse kaydet
- ✅ Ödeme planı çıkar
- ✅ Dashboard'u kontrol et
- ✅ Excel export çalışıyor mu?
- ✅ Email gönderebiliyor musun?

---

## 🎉 TAMAMLANDI!

Sisteminiz canlıda ve kullanıma hazır!

**Frontend URL:** https://senin-frontend-urlin.onrender.com
**Backend URL:** https://senin-backend-urlin.onrender.com

---

## ⚠️ Önemli Notlar

### Sleep Mode (15 dk inaktivite)
- Backend 15 dakika kullanılmazsa uyur
- İlk istek 30 saniye sürebilir
- **Çözüm:** UptimeRobot kullan (ücretsiz, her 5 dakikada ping at)

### Email Ayarları
- Gmail'de 2-Step Verification açık olmalı
- App Password kullanılmalı (normal şifre çalışmaz)
- SMTP_USER kısmına Gmail adresini yazmayı unutma!

---

## 🆘 Sorun mu Var?

### Backend'e bağlanamıyorum
✅ MongoDB Atlas'ta IP Whitelist: 0.0.0.0/0 var mı?
✅ Environment variables doğru girildi mi?
✅ Backend deploy durumu "Live" mı?

### Frontend API hatası
✅ CORS ayarı yapıldı mı?
✅ Frontend'de REACT_APP_API_URL doğru mu?
✅ Backend URL'i sonuna /api ekledin mi?

### Email gönderilmiyor
✅ Gmail App Password doğru mu? (yavxhigqsfvsswjh)
✅ SMTP_USER'a Gmail adresini yazdın mı?
✅ 2-Step Verification açık mı?

---

## 📞 İletişim Bilgilerin

**MongoDB Atlas:**
- Connection: mongodb+srv://fofenk_db:fofenkfofenk@fofenk.rfztasq.mongodb.net/fofora-theatre?retryWrites=true&w=majority
- Username: fofenk_db
- Password: fofenkfofenk

**Gmail App Password:**
- Password: yavx higq sfvs swjh (boşluksuz: yavxhigqsfvsswjh)

**GitHub Repo:**
- https://github.com/KULLANICI_ADIN/fofenk

---

Başarılar! 🚀🎭
