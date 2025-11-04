# Fofora Tiyatro Yönetim Sistemi

Tiyatro eğitim kurumları için kapsamlı yönetim sistemi.

## Özellikler

- 📚 Ders programı ve takvim yönetimi
- 👥 Öğrenci kayıt ve takip sistemi
- 💰 Ödeme planı ve tahsilat yönetimi
- 🧾 Gider takibi ve raporlama
- 👨‍🏫 Eğitmen ödemeleri
- 📱 Telefon rehberi ve WhatsApp entegrasyonu
- 📊 Detaylı dashboard ve raporlar
- 🏦 Çoklu kasa yönetimi

## Kurulum

### Gereksinimler
- Node.js (v16+)
- MongoDB

### Adımlar

1. Tüm paketleri yükle:
```bash
npm run install-all
```

2. Server için `.env` dosyası oluştur:
```bash
cd server
cp .env.example .env
```

3. MongoDB bağlantı bilgilerini `.env` dosyasında güncelle

4. Uygulamayı başlat:
```bash
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:5000

## Proje Yapısı

```
FOFENK/
├── client/          # React frontend
├── server/          # Node.js backend
└── package.json     # Root package.json
```
