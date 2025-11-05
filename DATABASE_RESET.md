# 🔄 Database Sıfırlama Kılavuzu

## Yerel Geliştirmede (Localhost)

1. Server klasörüne git:
```bash
cd server
```

2. Reset script'ini çalıştır:
```bash
npm run reset-db
```

3. Tarayıcıda `http://localhost:3000` adresine git

4. Otomatik olarak `/setup` sayfasına yönlendirileceksin

5. 3 adımlı kurulumu tamamla:
   - **Adım 1:** Admin kullanıcısı oluştur
   - **Adım 2:** Kurum bilgilerini gir
   - **Adım 3:** İlk sezonu oluştur

6. ✅ Sistem sıfırdan kullanıma hazır!

---

## Render.com'da (Production)

### Yöntem 1: Render Dashboard Üzerinden

1. https://dashboard.render.com adresine git

2. **fofenk** backend servisine tıkla

3. Üstteki **"Shell"** sekmesine tıkla

4. Terminal açılacak, şu komutu çalıştır:
```bash
npm run reset-db
```

5. Frontend URL'ine git: `https://fofenk-front.onrender.com`

6. Otomatik olarak setup sayfasına yönlendirileceksin

### Yöntem 2: MongoDB Atlas Üzerinden (Manuel)

1. https://cloud.mongodb.com adresine git

2. **"Browse Collections"** tıkla

3. **"fofora-theatre"** database'ini seç

4. Her collection için:
   - Collection'a tıkla
   - **"Delete all documents"** seç
   - Onayla

5. Frontend URL'ine git ve setup yap

---

## ⚠️ Önemli Notlar

### Ne Silinir?
- ✅ Tüm kullanıcılar
- ✅ Tüm kurumlar
- ✅ Tüm sezonlar
- ✅ Tüm öğrenciler
- ✅ Tüm dersler
- ✅ Tüm ödemeler
- ✅ Tüm giderler
- ✅ Tüm aktivite logları
- ✅ **HER ŞEY!**

### Geri Alınamaz!
Database sıfırlama işlemi **GERİ ALINAMAZ**. Emin olmadan çalıştırma!

### Yedek Al
Önemli veriler varsa önce yedek al:
1. Render.com → Backend → "Shell"
2. Backup oluştur (sistem otomatik yedekler de yapıyor)

---

## 🚀 İlk Kurulum Sonrası

Setup tamamlandıktan sonra:

1. **Admin hesabınla giriş yap**
2. **Sezonunuzu aktif yap** (Sezon Yönetimi → Toggle switch)
3. **Kasa oluştur** (Ana Kasa)
4. **Kullanıcılar ekle** (ihtiyaç varsa)
5. **Sistemi kullanmaya başla!**

---

## 🆘 Sorun Çözme

### "npm run reset-db" çalışmıyor
- `cd server` komutuyla server klasöründe olduğundan emin ol
- `npm install` çalıştır
- Tekrar dene

### Setup sayfası açılmıyor
- Tarayıcı cache'ini temizle (Ctrl+Shift+Delete)
- localStorage'ı temizle (F12 → Console → `localStorage.clear()`)
- Sayfayı yenile (Ctrl+F5)

### Render'da Shell açılmıyor
- Birkaç saniye bekle, yavaş açılabilir
- Sayfayı yenile
- Başka tarayıcı dene

---

## 📞 Test Verisi Önerileri

İlk kurulumdan sonra test için:

### Öğrenci Örneği:
- Ad: Ahmet
- Soyad: Yılmaz
- TC: 12345678901
- Doğum Tarihi: 01/01/2010
- Telefon: 0 (555) 123 45 67
- Anne: Ayşe Yılmaz - 0 (555) 111 22 33
- Baba: Mehmet Yılmaz - 0 (555) 222 33 44

### Ders Örneği:
- Ders Adı: Tiyatro Temel
- Fiyat Tipi: Aylık
- Aylık Ücret: 1500 TL
- Kontenjan: 15 kişi

### Eğitmen Örneği:
- Ad: Elif
- Soyad: Demir
- Ödeme Tipi: Aylık
- Aylık Ücret: 15000 TL

---

Başarılar! 🎭
