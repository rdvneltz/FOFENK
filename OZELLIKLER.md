# Fofora Tiyatro Yönetim Sistemi - Özellikler Listesi

## ✅ Tamamlanan Tüm Özellikler

### 🎭 Temel Sistem

#### 1. Kurum ve Sezon Yönetimi
- Kurum profili oluşturma ve düzenleme
- Çoklu sezon desteği (2025-2026, vb.)
- Aktif sezon seçimi
- Logo ve antetli kağıt yükleme

#### 2. Öğrenci Yönetimi
- Detaylı öğrenci kayıt formu (TC No, doğum tarihi, adres, vb.)
- Veli bilgileri (anne, baba, acil durum)
- Öğrenci bakiye takibi
- Aynı öğrencinin birden fazla derse kaydı
- İndirim/Burs sistemi (tam burslu, %X indirimli, kardeş indirimi)
- Öğrenci ID sistemi (aynı isimde öğrenciler için)
- Deneme dersi sistemi (ücretsiz, ayrı takip)

#### 3. Ders Yönetimi
- Ders oluşturma ve düzenleme
- Ücretlendirme tipleri: Aylık / Ders başı
- Farklı yaş grupları için farklı dersler
- Ders renk kodlaması (takvimde görünür)
- Ücretsiz ders desteği
- Derslere toplu öğrenci ekleme

### 📅 Takvim ve Program

#### 4. Aylık Takvim
- Aylık görünüm (Pazartesi başlangıçlı)
- Derslerin saatleriyle gösterimi
- Aynı gün farklı saatlerde dersler
- Resmi tatil gösterimi (otomatik atlama isteğe bağlı)
- Ders iptal/erteleme
- Tıklanabilir ders detayları

#### 5. **⚡ Otomatik Ders Programı Oluşturma**
- Seçilen günlerde otomatik program (Pzt-Çrş-Cum gibi)
- Haftalık, iki haftalık, aylık tekrar seçenekleri
- Başlangıç/bitiş tarihi belirleme
- Saat aralığı ayarlama
- Eğitmen çakışma kontrolü
- Resmi tatilleri otomatik atlama
- Tek tuşla tüm sezon programı

#### 6. Yoklama Sistemi
- Takvimde derse tıklayarak yoklama alma
- Katılan/katılmayan seçimi
- Öğrenci detayında yoklama geçmişi
- Devamsızlık ücrete yansımıyor (sadece takip)

### 💰 Ödeme ve Finans

#### 7. Ödeme Planı Sistemi
- Nakit peşin
- Nakit taksitli (2 ayda bir, 3 ayda bir, vb.)
- Kredi kartı (1-12 taksit)
- Taksit vade tarihleri düzenlenebilir
- Kısmi ödeme desteği
- Fazla ödeme yönetimi
- Faturalı/faturasız ödeme

#### 8. KDV ve Komisyon
- Ayarlanabilir KDV oranı (varsayılan %10)
- Kredi kartı komisyon oranları (taksit sayısına göre)
- Otomatik KDV kesintisi (faturalı ödemelerde)
- Otomatik komisyon hesaplama
- Gider olarak kayıt

#### 9. Ödeme Takibi
- Öğrenci bazında bakiye gösterimi
- Ödeme geçmişi
- Beklenen ödemeler (bu hafta, bu ay, sezon)
- Vadesi gelen ödemeler uyarısı
- **PDF ödeme planı oluşturma**
- Ödeme iptali ve iadesi

#### 10. Kasa Yönetimi
- Çoklu kasa desteği
- Başlangıç bakiyesi
- Eksi bakiye desteği
- Kasalar arası virman
- Manuel bakiye ekleme
- Otomatik gelir/gider yansıtma

#### 11. Gider Yönetimi
- 27 farklı gider kategorisi
- Fatura/belge ekleme
- Kategori filtreleme
- Tarih aralığı filtreleme
- Planlanan giderler
- Gider analizi raporları

### 👨‍🏫 Eğitmen Yönetimi

#### 12. Eğitmen Sistemi
- Eğitmen bilgileri ve iletişim
- Ödeme tipleri:
  - Aylık maaş
  - Ders başı ücret
  - Saat başı ücret
  - Öğrenci sayısı üzerinden komisyon
- Ders tamamlandı işaretleme
- Otomatik ücret hesaplama
- Manuel ücret düzenleme
- Eğitmen borç takibi
- Eğitmen ödeme geçmişi

### 📊 Raporlama ve Analiz

#### 13. Dashboard İstatistikleri
- Toplam öğrenci sayısı (tam burslular ayrı)
- Kasa bakiyeleri
- Toplam gelir/gider
- Net kar/zarar
- Beklenen ödemeler
- Planlanan harcamalar

#### 14. **📈 İnteraktif Grafikler (Chart.js)**
- **Line Chart**: Aylık gelir/gider trendi (son 12 ay)
- **Bar Chart**: Öğrenci kayıt artışı (son 12 ay)
- **Pie Chart**: Ödeme yöntemleri dağılımı
- **Doughnut Chart**: Gider kategorileri dağılımı
- Tüm grafikler interaktif ve responsive

#### 15. Detaylı Raporlar
- Öğrenci borç/alacak raporu
- Eğitmen alacak raporu
- Gider analizi raporu
- Kasaya giriş/çıkış raporu
- Günlük/haftalık/aylık/sezonluk görünümler
- **Excel'e aktarma özelliği**

### 📞 İletişim

#### 16. Telefon Rehberi
- Tüm öğrenci, veli ve eğitmenlerin iletişim bilgileri
- Kategori filtreleme
- WhatsApp entegrasyonu (tek tıkla mesaj)
- Telefona tıklayınca otomatik WhatsApp açma

#### 17. **📧 Email Gönderimi (NodeMailer)**
- Tekil email gönderimi
- Toplu email gönderimi (öğrenciler, veliler)
- 5 hazır email şablonu:
  - Hoşgeldin mesajı
  - Ödeme hatırlatma
  - Ders hatırlatma
  - Genel bilgilendirme
  - Özel mesaj
- {name} placeholder ile otomatik isim ekleme
- Dosya ekleme (maksimum 5 dosya, 10MB)
- SMTP yapılandırma (Gmail, Outlook, vb.)
- Ödeme planı emaille gönderme

#### 18. Mesaj Şablonları
- Özelleştirilebilir mesaj şablonları
- WhatsApp mesaj şablonları:
  - Genel ödeme planı
  - Aylık ödeme hatırlatma
  - Deneme dersi hatırlatma
  - Haftalık ders hatırlatma
- Değişken desteği: {öğrenci_adı}, {tutar}, {tarih}, vb.
- Toplu mesaj gönderme

### 👥 Kullanıcı Yönetimi

#### 19. **Çoklu Kullanıcı Sistemi (Auth olmadan)**
- Kullanıcı oluşturma ve yönetimi
- Kullanıcı rolleri: Admin, Müdür, Muhasebe, Personel
- Yetki yönetimi (öğrenci, ödeme, gider, raporlar, vb.)
- Kullanıcı seçimi (Header'da)
- Avatar renklendirme
- Kullanıcı bazlı aktivite takibi

#### 20. **Aktivite Logları**
- Her işlem için kullanıcı kaydı
- Kim, ne, ne zaman yaptı
- Filtreleme: Kullanıcı, işlem tipi, tarih aralığı
- Detaylı aktivite geçmişi
- Öğrenci/ödeme/gider işlemleri takibi

### ⚙️ Sistem Ayarları

#### 21. Genel Ayarlar
- KDV oranı ayarlama
- Kredi kartı komisyon oranları (1-12 taksit için)
- Logo yükleme
- Antetli kağıt yükleme
- Kurum bilgileri güncelleme

#### 22. **📦 Yedekleme Sistemi**
- **Manuel yedekleme** (tek tuşla)
- **Otomatik yedekleme** (her gece 02:00)
- Yedekleri listeleme (tarih, boyut)
- Yedek indirme (ZIP formatında)
- Yedekten geri yükleme
- Eski yedekleri otomatik temizleme (30 gün)
- MongoDB dump/restore

### 📄 Dosya İşlemleri

#### 23. **📊 Excel Export**
- Öğrenci listesi Excel'e aktarma
- Ödeme listesi Excel'e aktarma
- Gider listesi Excel'e aktarma
- Raporları Excel'e aktarma
- Profesyonel formatlar (renkli başlıklar, kenarlıklar)
- Türkçe başlıklar ve tarih formatı
- Para birimi: TL

#### 24. PDF Oluşturma
- Ödeme planı PDF'i
- Logo ve antet dahil
- Öğrenci bilgileri
- Taksit detayları
- WhatsApp veya email ile gönderme

---

## 🚀 Teknik Özellikler

### Backend
- **Node.js + Express**
- **MongoDB + Mongoose**
- **RESTful API**
- **16 Route Dosyası**
- **14 MongoDB Modeli**
- **PDF Generator (PDFKit)**
- **Excel Generator (ExcelJS)**
- **Email Sender (NodeMailer)**
- **Backup Manager (MongoDB Dump)**
- **Schedule Generator (Otomatik Program)**

### Frontend
- **React 18**
- **Material-UI (MUI)**
- **React Router v6**
- **Chart.js (Grafikler)**
- **Axios (API)**
- **Context API (State Management)**
- **31 Komponent**
- **18 Sayfa**
- **Responsive Design (Mobil Uyumlu)**

### Özel Fonksiyonlar
- Tarih hesaplama fonksiyonları (haftalık, iki haftalık, aylık tekrar)
- KDV ve komisyon hesaplayıcıları
- Net tutar hesaplama
- Türkçe tarih ve gün isimleri
- Resmi tatil sistemi
- Eğitmen çakışma kontrolü

---

## 📱 Mobil Uyumluluk
- Tüm sayfalar responsive
- Mobil için drawer menü
- Touch-friendly butonlar ve formlar
- Mobil uyumlu tablolar

---

## 🔒 Güvenlik
- Environment variables (.env)
- File upload limitleri (10MB)
- Email validation
- SMTP güvenli bağlantı
- Otomatik dosya temizleme
- Backup encryption desteği

---

## 📦 Kurulum ve Kullanıma Hazır
- Detaylı kurulum dokümantasyonu (KURULUM.md)
- Environment variable örnekleri (.env.example)
- Package.json tüm dependencies ile
- README.md dosyası
- Gün sistemi notları (GUN_SISTEMI_NOTLARI.md)

---

## 🎯 İş Akışı Özeti

1. **Başlangıç**: Kurum → Sezon → Kasa oluştur
2. **Dersler**: Ders ekle → Eğitmen ata
3. **Öğrenciler**: Öğrenci kaydet → Derse kaydet
4. **Program**: Manuel veya otomatik program oluştur
5. **Ödemeler**: Ödeme planı çıkar → Ödeme al
6. **Takip**: Yoklama al → Raporları incele
7. **Finans**: Giderleri kaydet → Eğitmen öde
8. **İletişim**: Email/WhatsApp ile mesaj gönder
9. **Yedekleme**: Otomatik veya manuel yedek al

---

## ✨ Gelecek Geliştirmeler (İsteğe Bağlı)

- [ ] Online ödeme entegrasyonu (Iyzico, PayTR)
- [ ] SMS gönderimi
- [ ] Öğrenci portal (öğrencilerin kendi bilgilerini görmesi)
- [ ] Mobil uygulama
- [ ] WhatsApp Business API entegrasyonu (toplu mesaj)
- [ ] Gerçek authentication sistemi (JWT)
- [ ] Rol bazlı yetkilendirme
- [ ] Multi-language desteği

---

**Tüm özellikler çalışır durumda ve kullanıma hazırdır!** 🎉
