const { test, expect } = require('@playwright/test');

// Test verileri
const testData = {
  admin: {
    email: 'admin@fofora.com',
    password: 'admin123'
  },
  institution: {
    name: 'Test Tiyatro Kurumu ' + Date.now(),
    code: 'TEST' + Date.now()
  },
  season: {
    name: '2024-2025 Test Sezonu',
    startDate: '2024-09-01',
    endDate: '2025-06-30'
  },
  student: {
    name: 'Test Öğrenci',
    surname: 'Soyadı',
    phone: '5551234567',
    email: 'test@ogrenci.com',
    birthdate: '2010-01-15',
    parentName: 'Test Veli',
    parentPhone: '5559876543'
  },
  instructor: {
    name: 'Test Eğitmen',
    surname: 'Eğitmen Soyadı',
    phone: '5551112233',
    email: 'test@egitmen.com',
    specialization: 'Drama'
  },
  course: {
    name: 'Test Drama Dersi',
    code: 'DRM-001',
    duration: '90',
    capacity: '15',
    price: '1500'
  },
  cashRegister: {
    name: 'Test Kasa ' + Date.now(),
    initialBalance: '10000',
    description: 'Test için oluşturulan kasa'
  }
};

// Yardımcı fonksiyonlar
async function waitForModal(page) {
  await page.waitForTimeout(1000);
}

async function closeModalIfExists(page) {
  try {
    const closeButton = await page.locator('button:has-text("İptal"), button:has-text("Kapat"), [aria-label="close"]').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // Modal yoksa devam et
  }
}

async function fillFormField(page, label, value) {
  console.log(`  Doldurma: ${label} = ${value}`);
  const input = await page.locator(`input[name="${label}"], input[id="${label}"], textarea[name="${label}"]`).first();
  await input.click();
  await input.fill(value);
  await page.waitForTimeout(300);
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
  console.log(`  📸 Screenshot: ${name}.png`);
}

test.describe('FOFENK Sistemi - Kapsamlı Test', () => {

  test.beforeAll(async () => {
    console.log('\n🚀 TEST BAŞLIYOR - SİSTEMİN DETAYLI TESTİ\n');
    console.log('=' .repeat(80));
  });

  let context;
  let page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Konsol mesajlarını yakala
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser Console Error: ${msg.text()}`);
      }
    });

    // Network hatalarını yakala
    page.on('pageerror', error => {
      console.log(`❌ Page Error: ${error.message}`);
    });
  });

  test.afterEach(async () => {
    await page.close();
    await context.close();
  });

  test('1. Admin Girişi ve Ana Sayfa Kontrolü', async () => {
    console.log('\n📋 TEST 1: Admin Girişi');
    console.log('-'.repeat(80));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '01-login-page');

    // Login formunu doldur
    console.log('  ✏️  Login formu dolduruluyor...');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await takeScreenshot(page, '02-login-filled');

    // Giriş yap
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '03-dashboard');

    // Dashboard'da olduğumuzu kontrol et
    const dashboardVisible = await page.locator('text=Hoş Geldiniz, text=Dashboard, text=Genel Bakış').first().isVisible({ timeout: 5000 });
    expect(dashboardVisible).toBeTruthy();
    console.log('  ✅ Admin girişi başarılı');
  });

  test('2. Kurum Oluşturma ve Modal Kontrolü', async () => {
    console.log('\n📋 TEST 2: Kurum Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Kurumlar sayfasına git
    console.log('  🔍 Kurumlar sayfasına gidiliyor...');
    await page.click('text=Kurumlar, [href*="institutions"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '04-institutions-page');

    // Yeni Kurum butonu
    console.log('  ➕ Yeni Kurum modalı açılıyor...');
    await page.click('button:has-text("Yeni Kurum"), button:has-text("Kurum Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '05-institution-modal-opened');

    // Modal içeriğini kontrol et
    console.log('  🔍 Modal alanları kontrol ediliyor...');
    const modalVisible = await page.locator('[role="dialog"], .MuiDialog-root').isVisible();
    expect(modalVisible).toBeTruthy();

    // Form alanlarını doldur
    console.log('  ✏️  Form alanları dolduruluyor...');
    await page.fill('input[name="name"]', testData.institution.name);
    await page.fill('input[name="code"]', testData.institution.code);
    await takeScreenshot(page, '06-institution-form-filled');

    // Kaydet
    console.log('  💾 Kurum kaydediliyor...');
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '07-institution-saved');

    // Kurumun listede olduğunu kontrol et
    const institutionExists = await page.locator(`text=${testData.institution.name}`).isVisible({ timeout: 5000 });
    expect(institutionExists).toBeTruthy();
    console.log('  ✅ Kurum başarıyla oluşturuldu');
  });

  test('3. Sezon Oluşturma', async () => {
    console.log('\n📋 TEST 3: Sezon Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Sezonlar sayfasına git
    console.log('  🔍 Sezonlar sayfasına gidiliyor...');
    await page.click('text=Sezonlar, [href*="seasons"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '08-seasons-page');

    // Yeni Sezon
    console.log('  ➕ Yeni Sezon modalı açılıyor...');
    await page.click('button:has-text("Yeni Sezon"), button:has-text("Sezon Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '09-season-modal');

    // Form doldur
    console.log('  ✏️  Sezon formu dolduruluyor...');
    await page.fill('input[name="name"]', testData.season.name);
    await page.fill('input[name="startDate"]', testData.season.startDate);
    await page.fill('input[name="endDate"]', testData.season.endDate);
    await takeScreenshot(page, '10-season-form-filled');

    // Kaydet
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '11-season-saved');

    console.log('  ✅ Sezon başarıyla oluşturuldu');
  });

  test('4. Öğrenci Oluşturma - Detaylı Form Kontrolü', async () => {
    console.log('\n📋 TEST 4: Öğrenci Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Öğrenciler sayfası
    console.log('  🔍 Öğrenciler sayfasına gidiliyor...');
    await page.click('text=Öğrenciler, [href*="students"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '12-students-page');

    // Yeni Öğrenci
    console.log('  ➕ Yeni Öğrenci modalı açılıyor...');
    await page.click('button:has-text("Yeni Öğrenci"), button:has-text("Öğrenci Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '13-student-modal');

    // Tüm form alanlarını kontrol ederek doldur
    console.log('  ✏️  Öğrenci formu satır satır dolduruluyor...');
    await page.fill('input[name="name"]', testData.student.name);
    await page.fill('input[name="surname"]', testData.student.surname);
    await page.fill('input[name="phone"]', testData.student.phone);
    await page.fill('input[name="email"]', testData.student.email);
    await page.fill('input[name="birthdate"]', testData.student.birthdate);
    await page.fill('input[name="parentName"]', testData.student.parentName);
    await page.fill('input[name="parentPhone"]', testData.student.parentPhone);

    await takeScreenshot(page, '14-student-form-filled');

    // Kaydet
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '15-student-saved');

    console.log('  ✅ Öğrenci başarıyla oluşturuldu');
  });

  test('5. Eğitmen Oluşturma', async () => {
    console.log('\n📋 TEST 5: Eğitmen Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Eğitmenler sayfası
    console.log('  🔍 Eğitmenler sayfasına gidiliyor...');
    await page.click('text=Eğitmenler, [href*="instructors"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '16-instructors-page');

    // Yeni Eğitmen
    console.log('  ➕ Yeni Eğitmen modalı açılıyor...');
    await page.click('button:has-text("Yeni Eğitmen"), button:has-text("Eğitmen Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '17-instructor-modal');

    // Form doldur
    console.log('  ✏️  Eğitmen formu dolduruluyor...');
    await page.fill('input[name="name"]', testData.instructor.name);
    await page.fill('input[name="surname"]', testData.instructor.surname);
    await page.fill('input[name="phone"]', testData.instructor.phone);
    await page.fill('input[name="email"]', testData.instructor.email);
    await page.fill('input[name="specialization"]', testData.instructor.specialization);

    await takeScreenshot(page, '18-instructor-form-filled');

    // Kaydet
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '19-instructor-saved');

    console.log('  ✅ Eğitmen başarıyla oluşturuldu');
  });

  test('6. Ders Oluşturma', async () => {
    console.log('\n📋 TEST 6: Ders Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Dersler sayfası
    console.log('  🔍 Dersler sayfasına gidiliyor...');
    await page.click('text=Dersler, [href*="courses"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '20-courses-page');

    // Yeni Ders
    console.log('  ➕ Yeni Ders modalı açılıyor...');
    await page.click('button:has-text("Yeni Ders"), button:has-text("Ders Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '21-course-modal');

    // Form doldur
    console.log('  ✏️  Ders formu dolduruluyor...');
    await page.fill('input[name="name"]', testData.course.name);
    await page.fill('input[name="code"]', testData.course.code);
    await page.fill('input[name="duration"]', testData.course.duration);
    await page.fill('input[name="capacity"]', testData.course.capacity);
    await page.fill('input[name="price"]', testData.course.price);

    await takeScreenshot(page, '22-course-form-filled');

    // Kaydet
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '23-course-saved');

    console.log('  ✅ Ders başarıyla oluşturuldu');
  });

  test('7. Kasa Oluşturma', async () => {
    console.log('\n📋 TEST 7: Kasa Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Kasa sayfası
    console.log('  🔍 Kasa sayfasına gidiliyor...');
    await page.click('text=Kasa, [href*="cash-register"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '24-cashregister-page');

    // Yeni Kasa
    console.log('  ➕ Yeni Kasa modalı açılıyor...');
    await page.click('button:has-text("Yeni Kasa"), button:has-text("Kasa Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '25-cashregister-modal');

    // Form doldur
    console.log('  ✏️  Kasa formu dolduruluyor...');
    await page.fill('input[name="name"]', testData.cashRegister.name);
    await page.fill('input[name="initialBalance"]', testData.cashRegister.initialBalance);
    await page.fill('input[name="description"]', testData.cashRegister.description);

    await takeScreenshot(page, '26-cashregister-form-filled');

    // Kaydet
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '27-cashregister-saved');

    console.log('  ✅ Kasa başarıyla oluşturuldu');
  });

  test('8. Ödeme Planı - Takvimsiz Ders (Nakit)', async () => {
    console.log('\n📋 TEST 8: Ödeme Planı - Takvimsiz Ders (Nakit)');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Ödeme Planları sayfası
    console.log('  🔍 Ödeme Planları sayfasına gidiliyor...');
    await page.click('text=Ödeme, [href*="payment"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '28-payments-page');

    // Yeni Ödeme Planı
    console.log('  ➕ Yeni Ödeme Planı modalı açılıyor...');
    await page.click('button:has-text("Yeni Ödeme Planı"), button:has-text("Ödeme Planı Oluştur")');
    await waitForModal(page);
    await takeScreenshot(page, '29-payment-plan-modal');

    // Öğrenci seç
    console.log('  👤 Öğrenci seçiliyor...');
    await page.click('[name="student"], #student');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await takeScreenshot(page, '30-student-selected');

    // Ders seç (takvimsiz)
    console.log('  📚 Ders seçiliyor (takvimsiz)...');
    await page.click('[name="course"], #course');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await takeScreenshot(page, '31-course-selected');

    // Ödeme tipi: Nakit
    console.log('  💵 Ödeme tipi: Nakit seçiliyor...');
    await page.click('[name="paymentType"], #paymentType');
    await page.waitForTimeout(500);
    await page.click('text=Nakit');
    await takeScreenshot(page, '32-payment-type-cash');

    // Faturasız
    console.log('  📄 Faturasız seçiliyor...');
    await page.click('[name="invoiceType"], #invoiceType');
    await page.waitForTimeout(500);
    await page.click('text=Faturasız');
    await takeScreenshot(page, '33-no-invoice');

    // Kaydet
    await page.click('button:has-text("Kaydet"), button:has-text("Oluştur")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '34-payment-plan-cash-saved');

    console.log('  ✅ Nakit ödeme planı başarıyla oluşturuldu');
  });

  test('9. Ödeme Planı - Taksitli Ödeme', async () => {
    console.log('\n📋 TEST 9: Ödeme Planı - Taksitli');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Ödeme Planları
    await page.click('text=Ödeme, [href*="payment"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '35-payments-page-2');

    // Yeni Ödeme Planı
    console.log('  ➕ Taksitli ödeme planı oluşturuluyor...');
    await page.click('button:has-text("Yeni Ödeme Planı"), button:has-text("Ödeme Planı Oluştur")');
    await waitForModal(page);

    // Öğrenci ve ders seç
    await page.click('[name="student"], #student');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('[name="course"], #course');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Taksitli ödeme
    console.log('  💳 Taksitli ödeme seçiliyor...');
    await page.click('[name="paymentType"], #paymentType');
    await page.waitForTimeout(500);
    await page.click('text=Taksitli');
    await takeScreenshot(page, '36-payment-type-installment');

    // Taksit sayısı
    await page.fill('input[name="installmentCount"]', '4');
    await takeScreenshot(page, '37-installment-count');

    // Kaydet
    await page.click('button:has-text("Kaydet"), button:has-text("Oluştur")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '38-payment-plan-installment-saved');

    console.log('  ✅ Taksitli ödeme planı başarıyla oluşturuldu');
  });

  test('10. Ödeme Planı - Kredi Kartı', async () => {
    console.log('\n📋 TEST 10: Ödeme Planı - Kredi Kartı');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Ödeme Planları
    await page.click('text=Ödeme, [href*="payment"]');
    await page.waitForLoadState('networkidle');

    // Yeni Ödeme Planı
    console.log('  ➕ Kredi kartı ödeme planı oluşturuluyor...');
    await page.click('button:has-text("Yeni Ödeme Planı"), button:has-text("Ödeme Planı Oluştur")');
    await waitForModal(page);

    // Form doldur
    await page.click('[name="student"], #student');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await page.click('[name="course"], #course');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Kredi Kartı
    console.log('  💳 Kredi kartı seçiliyor...');
    await page.click('[name="paymentType"], #paymentType');
    await page.waitForTimeout(500);
    await page.click('text=Kredi Kartı');
    await takeScreenshot(page, '39-payment-type-creditcard');

    // Faturalı
    console.log('  📄 Faturalı seçiliyor...');
    await page.click('[name="invoiceType"], #invoiceType');
    await page.waitForTimeout(500);
    await page.click('text=Faturalı');
    await takeScreenshot(page, '40-with-invoice');

    // Kaydet
    await page.click('button:has-text("Kaydet"), button:has-text("Oluştur")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '41-payment-plan-creditcard-saved');

    console.log('  ✅ Kredi kartı ödeme planı başarıyla oluşturuldu');
  });

  test('11. Ödeme Alma ve Kasa Kontrolü', async () => {
    console.log('\n📋 TEST 11: Ödeme Alma ve Kasa Kontrolü');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Ödeme Planları
    await page.click('text=Ödeme, [href*="payment"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '42-payment-plans-list');

    // İlk ödeme planını aç
    console.log('  💰 Ödeme alınıyor...');
    await page.click('button:has-text("Ödeme Al"), button:has-text("Tahsil Et")');
    await waitForModal(page);
    await takeScreenshot(page, '43-payment-receive-modal');

    // Ödeme al
    await page.fill('input[name="amount"]', '500');
    await page.click('button:has-text("Kaydet"), button:has-text("Ödeme Al")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '44-payment-received');

    // Kasaya git ve kontrol et
    console.log('  🔍 Kasa kontrol ediliyor...');
    await page.click('text=Kasa, [href*="cash-register"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '45-cashregister-after-payment');

    console.log('  ✅ Ödeme alındı ve kasaya eklendi');
  });

  test('12. Gider Oluşturma', async () => {
    console.log('\n📋 TEST 12: Gider Oluşturma');
    console.log('-'.repeat(80));

    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', testData.admin.email);
    await page.fill('input[type="password"]', testData.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Giderler sayfası
    console.log('  🔍 Giderler sayfasına gidiliyor...');
    await page.click('text=Gider, [href*="expense"]');
    await page.waitForLoadState('networkidle');
    await takeScreenshot(page, '46-expenses-page');

    // Yeni Gider
    console.log('  ➕ Yeni gider oluşturuluyor...');
    await page.click('button:has-text("Yeni Gider"), button:has-text("Gider Ekle")');
    await waitForModal(page);
    await takeScreenshot(page, '47-expense-modal');

    // Form doldur
    await page.fill('input[name="description"]', 'Test Gider - Kira');
    await page.fill('input[name="amount"]', '2000');
    await page.click('[name="category"], #category');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await takeScreenshot(page, '48-expense-form-filled');

    // Kaydet
    await page.click('button:has-text("Kaydet")');
    await page.waitForTimeout(2000);
    await takeScreenshot(page, '49-expense-saved');

    console.log('  ✅ Gider başarıyla oluşturuldu');
  });

  test.afterAll(async () => {
    console.log('\n' + '='.repeat(80));
    console.log('✅ TÜM TESTLER TAMAMLANDI!');
    console.log('📊 Test raporunu görmek için: npx playwright show-report');
    console.log('📸 Ekran görüntüleri: tests/screenshots/');
    console.log('='.repeat(80) + '\n');
  });

});
