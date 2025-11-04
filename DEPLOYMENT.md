# Fofora Tiyatro - Deployment Rehberi

## 🚀 Ücretsiz Hosting Seçenekleri

### 1. **Render.com** (ÖNERİLEN) ⭐
- **Backend ve Frontend için ücretsiz hosting**
- MongoDB Atlas ile kolay entegrasyon
- Otomatik SSL sertifikası
- GitHub ile otomatik deploy
- 750 saat/ay ücretsiz
- Sleep modu (15 dk inaktivite sonrası)

### 2. Railway.app (Alternatif)
- $5 ücretsiz kredi (aylık)
- Kolay deployment
- MongoDB entegrasyonu

### 3. Cyclic.sh (Alternatif)
- Tam ücretsiz
- Serverless mimari

---

## 📋 ADIM ADIM DEPLOYMENT (RENDER.COM)

### ADIM 1: Git'e Push Et

#### Git Desktop ile:
1. Git Desktop'ı aç
2. Sol üstteki "Current Repository" → "FOFENK" seçili olmalı
3. Sol panelde tüm değişiklikleri göreceksin
4. Sol altta "Summary" kısmına commit mesajı yaz:
   ```
   feat: Fofora Tiyatro Yönetim Sistemi - İlk versiyon

   - Öğrenci, ders, ödeme yönetimi
   - Dashboard ve raporlama
   - Excel export, Email gönderimi
   - Otomatik yedekleme
   - Grafik ve analiz
   ```
5. "Commit to main" butonuna tıkla
6. Üstteki "Push origin" butonuna tıkla

#### Komut satırı ile (Alternatif):
```bash
cd /Users/rdvneltz/Desktop/FOFENK

# Git başlat (eğer yoksa)
git init
git add .
git commit -m "feat: Fofora Tiyatro Yönetim Sistemi - İlk versiyon"

# GitHub'a bağla (eğer bağlı değilse)
git remote add origin https://github.com/KULLANICI_ADIN/fofenk.git
git branch -M main
git push -u origin main
```

---

### ADIM 2: MongoDB Atlas Kurulumu

1. **MongoDB Atlas'a Kaydol:**
   - https://www.mongodb.com/cloud/atlas/register adresine git
   - Ücretsiz hesap oluştur (M0 - FREE tier)

2. **Cluster Oluştur:**
   - "Build a Database" → "FREE" → "Create"
   - Cloud Provider: AWS
   - Region: Frankfurt (en yakın)
   - Cluster Name: fofora-theatre

3. **Kullanıcı Oluştur:**
   - Security → Database Access → Add New Database User
   - Username: `fofora-admin`
   - Password: Güçlü bir şifre oluştur (KAYDET!)
   - Database User Privileges: "Read and write to any database"
   - Add User

4. **IP Whitelist:**
   - Security → Network Access → Add IP Address
   - "Allow Access from Anywhere" (0.0.0.0/0) seç
   - Confirm

5. **Connection String Al:**
   - Database → Connect → Connect your application
   - Driver: Node.js
   - Connection string'i kopyala (ŞU FORMATTA):
   ```
   mongodb+srv://fofora-admin:<password>@fofora-theatre.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - `<password>` kısmını gerçek şifrenle değiştir
   - Database adı ekle: `?retryWrites=true` yerine `/fofora-theatre?retryWrites=true`

**Final Connection String:**
```
mongodb+srv://fofora-admin:ŞIFREN@fofora-theatre.xxxxx.mongodb.net/fofora-theatre?retryWrites=true&w=majority
```

---

### ADIM 3: Render.com'da Backend Deploy

1. **Render.com'a Kaydol:**
   - https://render.com adresine git
   - "Get Started for Free" → GitHub ile giriş yap

2. **New Web Service Oluştur:**
   - Dashboard → "New +" → "Web Service"
   - GitHub repository'ni bağla (fofenk)
   - "Connect" tıkla

3. **Backend Ayarları:**
   ```
   Name: fofora-backend
   Region: Frankfurt (EU Central)
   Branch: main
   Root Directory: server
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: FREE
   ```

4. **Environment Variables Ekle:**
   "Advanced" → "Add Environment Variable"

   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<MongoDB Atlas connection string'ini buraya yapıştır>
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<gmail adresin>
   SMTP_PASS=<gmail app password>
   EMAIL_FROM=Fofora Tiyatro <noreply@fofora.com>
   ```

5. **Create Web Service** → Deployment başlayacak (5-10 dk sürer)

6. **Backend URL'ini Kaydet:**
   - Deploy tamamlanınca üstte URL göreceksin:
   ```
   https://fofora-backend.onrender.com
   ```

---

### ADIM 4: Render.com'da Frontend Deploy

1. **Yeni Static Site Oluştur:**
   - Dashboard → "New +" → "Static Site"
   - Aynı repository'yi seç (fofenk)

2. **Frontend Ayarları:**
   ```
   Name: fofora-frontend
   Region: Frankfurt (EU Central)
   Branch: main
   Root Directory: client
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

3. **Environment Variables Ekle:**
   ```
   REACT_APP_API_URL=https://fofora-backend.onrender.com/api
   ```

4. **Create Static Site** → Deployment başlayacak

5. **Frontend URL'ini Kaydet:**
   ```
   https://fofora-frontend.onrender.com
   ```

---

### ADIM 5: Backend'de CORS Ayarı

Backend'in frontend'den gelen istekleri kabul etmesi için:

1. **server/server.js** dosyasını güncelle:

```javascript
// CORS ayarını güncelle
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://fofora-frontend.onrender.com' // Frontend URL'ini ekle
  ],
  credentials: true
}));
```

2. **Git'e push et:**
```bash
git add .
git commit -m "fix: CORS ayarı eklendi"
git push
```

3. Render otomatik yeniden deploy edecek

---

### ADIM 6: Frontend API URL Güncellemesi

1. **client/src/api.js** dosyasını kontrol et:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
```

2. Eğer değilse düzenle ve push et

---

### ADIM 7: Test Et

1. **Frontend'e git:**
   ```
   https://fofora-frontend.onrender.com
   ```

2. **İlk Kurulum:**
   - Kurum Profili Oluştur: Fofora Tiyatro
   - Sezon Oluştur: 2025-2026
   - İlk Kullanıcıyı Oluştur
   - Kasa Oluştur

3. **Test İşlemleri:**
   - Öğrenci ekle
   - Ders oluştur
   - Ödeme planı çıkar
   - Grafikler yükleniyor mu kontrol et

---

## 🔧 Gmail App Password Alma (Email için)

1. Google hesabına giriş yap
2. https://myaccount.google.com/security adresine git
3. "2-Step Verification" açık olmalı (değilse aç)
4. https://myaccount.google.com/apppasswords adresine git
5. "Select app" → "Mail"
6. "Select device" → "Other" → "Fofora Theatre"
7. "Generate"
8. 16 haneli şifreyi kopyala
9. Render'da `SMTP_PASS` olarak kullan

---

## 📱 Önemli Notlar

### Render.com FREE Plan Sınırları:
- **Backend:** 15 dakika inaktivite sonrası sleep mode
- **İlk istek:** Sleep modundan uyanması ~30 saniye sürebilir
- **Bandwidth:** 100 GB/ay
- **Build süresi:** 750 saat/ay

### Sleep Mode'u Önlemek İçin:
1. **UptimeRobot** kullan (ücretsiz):
   - https://uptimerobot.com
   - Backend URL'ini ekle
   - Her 5 dakikada bir ping at

2. Ya da **Cron Job** ekle (Render'da):
   - Settings → Cron Jobs
   - Schedule: `*/5 * * * *` (Her 5 dakika)
   - Command: `curl https://fofora-backend.onrender.com/api/health`

---

## 🆘 Sorun Giderme

### 1. Backend'e Bağlanamıyorum
- Environment variables doğru mu kontrol et
- MongoDB Atlas IP whitelist ayarı var mı
- Backend'in deploy durumu "Live" mi

### 2. Frontend'de API Hatası
- CORS ayarı yapıldı mı
- REACT_APP_API_URL doğru mu
- Browser console'da hata var mı

### 3. Email Gönderilmiyor
- Gmail App Password doğru mu
- SMTP ayarları environment variables'da mı
- 2-Step Verification açık mı

### 4. MongoDB Bağlantı Hatası
- Connection string doğru mu
- Şifre özel karakter içeriyorsa encode edilmiş mi
- Database adı connection string'de mi

---

## 🎯 Production Checklist

- [ ] GitHub'a push edildi
- [ ] MongoDB Atlas cluster oluşturuldu
- [ ] Connection string alındı
- [ ] Render.com'a kaydoldum
- [ ] Backend deploy edildi
- [ ] Frontend deploy edildi
- [ ] Environment variables eklendi
- [ ] CORS ayarı yapıldı
- [ ] Gmail App Password alındı
- [ ] Test edildi ve çalışıyor
- [ ] UptimeRobot kuruldu (isteğe bağlı)

---

## 🎉 Tebrikler!

Sisteminiz artık canlı ve erişilebilir!

**Frontend URL:** https://fofora-frontend.onrender.com
**Backend URL:** https://fofora-backend.onrender.com

Artık herhangi bir cihazdan sisteminize erişebilirsiniz! 🎭
