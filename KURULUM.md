# Fofora Tiyatro Yönetim Sistemi - Kurulum Rehberi

## Gereksinimler

- **Node.js** v16 veya üzeri
- **MongoDB** v5.0 veya üzeri (lokal veya MongoDB Atlas)
- **npm** veya **yarn**

## Kurulum Adımları

### 1. Tüm Paketleri Yükleyin

Proje ana dizininden aşağıdaki komutu çalıştırın:

```bash
npm run install-all
```

Bu komut root, client ve server klasörlerindeki tüm npm paketlerini yükleyecektir.

### 2. MongoDB'yi Başlatın

#### Lokal MongoDB:
```bash
mongod
```

#### MongoDB Atlas kullanıyorsanız:
- MongoDB Atlas hesabınıza giriş yapın
- Cluster'ınızın connection string'ini kopyalayın

### 3. Environment Variables Ayarlayın

`server/.env` dosyası oluşturun:

```bash
cd server
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fofora-theatre
NODE_ENV=development
```

**MongoDB Atlas kullanıyorsanız:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fofora-theatre?retryWrites=true&w=majority
```

### 4. Uygulamayı Başlatın

#### Development Modu (Frontend + Backend birlikte):

Proje ana dizininden:
```bash
npm run dev
```

Bu komut hem backend'i (port 5000) hem frontend'i (port 3000) birlikte başlatacaktır.

#### Sadece Backend:
```bash
npm run server
```

#### Sadece Frontend:
```bash
npm run client
```

### 5. Uygulamaya Erişim

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## İlk Kullanım

### 1. Kurum Profili Oluşturun

İlk açılışta "Kurum Ayarları" sayfasına yönlendirileceksiniz. Kurum bilgilerinizi girin:

- Kurum Adı: Fofora Tiyatro
- Adres, Telefon, Email vb.

### 2. Sezon Oluşturun

"Sezonlar" menüsünden yeni sezon oluşturun:

- Sezon Adı: 2025-2026 Dönemi
- Başlangıç Tarihi: 01.09.2025
- Bitiş Tarihi: 30.06.2026

### 3. Kasa Oluşturun

"Kasalar" menüsünden en az bir kasa oluşturun:

- Kasa Adı: Ana Kasa
- Başlangıç Bakiyesi: 0 TL

### 4. Ayarları Yapılandırın

"Ayarlar" menüsünden:

- KDV Oranı: %10
- Kredi Kartı Komisyon Oranları (varsayılanlar yüklüdür)
- Logo ve Antetli Kağıt yükleyin (isteğe bağlı)

## Veri Yapısı

### Temel İş Akışı

1. **Kurum** → **Sezon** oluşturun
2. **Kasa** oluşturun
3. **Dersler** ekleyin
4. **Eğitmenler** ekleyin
5. **Öğrenciler** kaydedin
6. Öğrencileri **derslere kayıt** edin
7. **Aylık program** oluşturun
8. **Ödeme planları** çıkarın
9. **Ödemeler** alın
10. **Yoklama** alın

## Production Deployment

### Build Alma

```bash
cd client
npm run build
```

Build dosyaları `client/build/` klasöründe oluşacaktır.

### Backend Deployment (örn. Heroku, DigitalOcean)

1. MongoDB Atlas bağlantı string'ini `.env` dosyasına ekleyin
2. `NODE_ENV=production` ayarlayın
3. Server'ı başlatın:

```bash
cd server
npm start
```

### Frontend Deployment (örn. Vercel, Netlify)

1. `client/build` klasörünü deploy edin
2. API base URL'i production server'ınıza göre güncelleyin

## Sık Karşılaşılan Sorunlar

### MongoDB Bağlantı Hatası

**Hata**: `MongoNetworkError: connect ECONNREFUSED`

**Çözüm**:
- MongoDB servisinin çalıştığından emin olun: `mongod`
- `.env` dosyasındaki MONGODB_URI'yi kontrol edin

### Port Çakışması

**Hata**: `EADDRINUSE: address already in use`

**Çözüm**:
- Başka bir uygulama 3000 veya 5000 portunu kullanıyorsa:
  - Backend için: `.env` dosyasında PORT değerini değiştirin
  - Frontend için: `client/package.json` içinde proxy'yi güncelleyin

### CORS Hatası

**Hata**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Çözüm**:
- Backend `server.js` dosyasında CORS ayarlarını kontrol edin
- Development'ta proxy kullanıldığından emin olun

## Destek

Herhangi bir sorunla karşılaşırsanız:

1. `server/` ve `client/` klasörlerinde `node_modules` klasörlerini silin
2. `npm run install-all` komutunu tekrar çalıştırın
3. MongoDB'nin çalıştığından emin olun
4. `.env` dosyasını kontrol edin

## Lisans

Bu proje özel kullanım içindir.
