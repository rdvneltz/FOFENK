# Gün Sistemi - Önemli Notlar

## Haftanın İlk Günü: Pazartesi

Bu sistemde **Pazartesi haftanın ilk günüdür** (Türkiye standardı).

## Gün Numaralandırma Sistemi

Sistemde iki farklı gün numaralandırma formatı kullanılmaktadır:

### 1. Kullanıcı Arayüzü ve API (Standart Format)
```
1 = Pazartesi
2 = Salı
3 = Çarşamba
4 = Perşembe
5 = Cuma
6 = Cumartesi
7 = Pazar
```

### 2. JavaScript Date Objesi (Internal)
JavaScript'in `Date.getDay()` fonksiyonu şu formatı kullanır:
```
0 = Pazar
1 = Pazartesi
2 = Salı
3 = Çarşamba
4 = Perşembe
5 = Cuma
6 = Cumartesi
```

## Format Dönüşümü

Helper fonksiyonlarımızda (server/utils/helpers.js) bu dönüşüm otomatik yapılır:

```javascript
// Standart format (1-7) -> JavaScript format (0-6)
const targetDay = dayOfWeek === 7 ? 0 : dayOfWeek;
```

## Kullanım Örnekleri

### Ders Programı Oluşturma

Kullanıcı arayüzünde:
- Pazartesi dersi seçilirse → dayOfWeek = 1 gönderilir
- Pazar dersi seçilirse → dayOfWeek = 7 gönderilir

Backend'de:
- Helper fonksiyonları bu değerleri JavaScript formatına çevirir
- Tarih hesaplamaları yapılır

### Takvim Görünümü

Frontend'de (client/src/pages/Calendar.js):
- Hafta başlıkları: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
- Ayın ilk gününün pozisyonu JavaScript formatından hesaplanır ve Pazartesi başlangıçlı olacak şekilde ayarlanır

## İlgili Fonksiyonlar

### server/utils/helpers.js

1. **getRecurringDates(startDate, endDate, dayOfWeek)**
   - dayOfWeek: 1-7 (Pazartesi-Pazar)

2. **getRecurringDatesMultiple(startDate, endDate, daysOfWeek)**
   - daysOfWeek: [1,3,5] gibi dizi (Pazartesi, Çarşamba, Cuma)

3. **getBiweeklyDates(startDate, endDate, dayOfWeek)**
   - dayOfWeek: 1-7 (Pazartesi-Pazar)

4. **getWeekdayCountInMonth(year, month, dayOfWeek)**
   - dayOfWeek: 1-7 (Pazartesi-Pazar)

5. **getDayNameTR(dayOfWeek)**
   - dayOfWeek: 1-7 (Pazartesi-Pazar)
   - Return: "Pazartesi", "Salı", vb.

## Frontend Components

### client/src/pages/Calendar.js
- Takvim haftası Pazartesi ile başlar
- `weekDays` dizisi: ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
- Ayın ilk gününün pozisyonu hesaplanırken Pazartesi=0 olacak şekilde ayarlanır

## Önemli Uyarılar

1. **API'den gün değeri gönderirken**: 1-7 formatını kullanın (1=Pazartesi, 7=Pazar)
2. **Frontend'de tarih gösterirken**: Türkçe gün isimleri kullanın
3. **JavaScript Date ile çalışırken**: Helper fonksiyonlarını kullanın, manuel dönüşüm yapmayın
4. **Yeni tarih hesaplama fonksiyonu eklerken**: Format dönüşümünü unutmayın

## Test Senaryoları

### Senaryo 1: Her Pazartesi Dersi
```
Input: dayOfWeek = 1
Beklenen: Pazartesi günlerine ders eklenmeli
```

### Senaryo 2: Her Pazar Dersi
```
Input: dayOfWeek = 7
Beklenen: Pazar günlerine ders eklenmeli
```

### Senaryo 3: Takvim Görünümü
```
Takvimin ilk kolonu: Pazartesi
Son kolonu: Pazar
```
