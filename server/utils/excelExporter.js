const ExcelJS = require('exceljs');

// Turkey timezone offset (UTC+3) in milliseconds
// Needed because dates stored in MongoDB as UTC need to be adjusted
// Example: "Nov 1 midnight Turkey" = "Oct 31 21:00 UTC"
const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

// Helper function to format date as dd.mm.yyyy with Turkey timezone
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  // Add Turkey timezone offset to get the original local date
  const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
  const day = String(adjusted.getUTCDate()).padStart(2, '0');
  const month = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
  const year = adjusted.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount) return '0,00 TL';
  return `${amount.toFixed(2).replace('.', ',')} TL`;
};

// Helper function to style header row
const styleHeaderRow = (worksheet, headerRow) => {
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
};

// Helper function to auto-size columns
const autoSizeColumns = (worksheet) => {
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? String(cell.value).length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
  });
};

// Export students to Excel
const exportStudentsToExcel = async (students) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Öğrenciler');

  // Define columns
  worksheet.columns = [
    { header: 'Öğrenci No', key: 'studentNumber', width: 15 },
    { header: 'Ad', key: 'firstName', width: 20 },
    { header: 'Soyad', key: 'lastName', width: 20 },
    { header: 'TC Kimlik No', key: 'tcNumber', width: 15 },
    { header: 'Doğum Tarihi', key: 'birthDate', width: 15 },
    { header: 'Cinsiyet', key: 'gender', width: 10 },
    { header: 'Telefon', key: 'phone', width: 15 },
    { header: 'E-posta', key: 'email', width: 25 },
    { header: 'Adres', key: 'address', width: 30 },
    { header: 'Veli Adı', key: 'guardianName', width: 20 },
    { header: 'Veli Telefon', key: 'guardianPhone', width: 15 },
    { header: 'Kurum', key: 'institution', width: 25 },
    { header: 'Dönem', key: 'season', width: 20 },
    { header: 'Durum', key: 'status', width: 12 }
  ];

  // Style header row
  styleHeaderRow(worksheet, worksheet.getRow(1));

  // Add data rows
  students.forEach(student => {
    worksheet.addRow({
      studentNumber: student.studentNumber || '',
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      tcNumber: student.tcNumber || '',
      birthDate: formatDate(student.birthDate),
      gender: student.gender === 'male' ? 'Erkek' : student.gender === 'female' ? 'Kadın' : 'Diğer',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      institution: student.institution?.name || '',
      season: student.season?.name || '',
      status: student.status === 'active' ? 'Aktif' : 'Pasif'
    });
  });

  // Auto-size columns
  autoSizeColumns(worksheet);

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return workbook;
};

// Export payments to Excel
const exportPaymentsToExcel = async (payments) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ödemeler');

  // Define columns
  worksheet.columns = [
    { header: 'Ödeme No', key: 'paymentNumber', width: 15 },
    { header: 'Tarih', key: 'date', width: 15 },
    { header: 'Öğrenci Ad', key: 'studentFirstName', width: 20 },
    { header: 'Öğrenci Soyad', key: 'studentLastName', width: 20 },
    { header: 'Tutar', key: 'amount', width: 15 },
    { header: 'Ödeme Yöntemi', key: 'paymentMethod', width: 15 },
    { header: 'Açıklama', key: 'description', width: 30 },
    { header: 'Kurum', key: 'institution', width: 25 },
    { header: 'Dönem', key: 'season', width: 20 },
    { header: 'Durum', key: 'status', width: 12 }
  ];

  // Style header row
  styleHeaderRow(worksheet, worksheet.getRow(1));

  // Add data rows
  payments.forEach(payment => {
    worksheet.addRow({
      paymentNumber: payment.paymentNumber || '',
      date: formatDate(payment.date),
      studentFirstName: payment.student?.firstName || '',
      studentLastName: payment.student?.lastName || '',
      amount: formatCurrency(payment.amount),
      paymentMethod: getPaymentMethodLabel(payment.paymentMethod),
      description: payment.description || '',
      institution: payment.institution?.name || '',
      season: payment.season?.name || '',
      status: payment.status === 'completed' ? 'Tamamlandı' : payment.status === 'pending' ? 'Beklemede' : 'İptal'
    });
  });

  // Auto-size columns
  autoSizeColumns(worksheet);

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return workbook;
};

// Export expenses to Excel
const exportExpensesToExcel = async (expenses) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Giderler');

  // Define columns
  worksheet.columns = [
    { header: 'Gider No', key: 'expenseNumber', width: 15 },
    { header: 'Tarih', key: 'date', width: 15 },
    { header: 'Kategori', key: 'category', width: 20 },
    { header: 'Açıklama', key: 'description', width: 30 },
    { header: 'Tutar', key: 'amount', width: 15 },
    { header: 'Ödeme Yöntemi', key: 'paymentMethod', width: 15 },
    { header: 'Kurum', key: 'institution', width: 25 },
    { header: 'Dönem', key: 'season', width: 20 },
    { header: 'Durum', key: 'status', width: 12 }
  ];

  // Style header row
  styleHeaderRow(worksheet, worksheet.getRow(1));

  // Add data rows
  expenses.forEach(expense => {
    worksheet.addRow({
      expenseNumber: expense.expenseNumber || '',
      date: formatDate(expense.date),
      category: getExpenseCategoryLabel(expense.category),
      description: expense.description || '',
      amount: formatCurrency(expense.amount),
      paymentMethod: getPaymentMethodLabel(expense.paymentMethod),
      institution: expense.institution?.name || '',
      season: expense.season?.name || '',
      status: expense.status === 'completed' ? 'Tamamlandı' : expense.status === 'pending' ? 'Beklemede' : 'İptal'
    });
  });

  // Auto-size columns
  autoSizeColumns(worksheet);

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return workbook;
};

// Export report to Excel
const exportReportToExcel = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Rapor');

  // Add report title
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = reportData.title || 'Finansal Rapor';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1F4788' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE7F0FF' }
  };
  worksheet.getRow(1).height = 30;

  // Add report period
  worksheet.mergeCells('A2:D2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Dönem: ${formatDate(reportData.startDate)} - ${formatDate(reportData.endDate)}`;
  periodCell.font = { size: 12 };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Add empty row
  worksheet.addRow([]);

  // Summary section
  const summaryRow = worksheet.addRow(['', 'Özet Bilgiler', '', '']);
  worksheet.mergeCells(`A${summaryRow.number}:D${summaryRow.number}`);
  styleHeaderRow(worksheet, summaryRow);

  // Add summary data
  if (reportData.summary) {
    worksheet.addRow(['Toplam Gelir', formatCurrency(reportData.summary.totalIncome)]);
    worksheet.addRow(['Toplam Gider', formatCurrency(reportData.summary.totalExpenses)]);
    worksheet.addRow(['Net Kar/Zarar', formatCurrency(reportData.summary.netProfit)]);
    worksheet.addRow(['Ödenmemiş Tahsilat', formatCurrency(reportData.summary.pendingPayments)]);
  }

  // Add empty row
  worksheet.addRow([]);

  // Detailed payments section
  if (reportData.payments && reportData.payments.length > 0) {
    const paymentsHeaderRow = worksheet.addRow(['Tarih', 'Öğrenci', 'Tutar', 'Açıklama']);
    styleHeaderRow(worksheet, paymentsHeaderRow);

    reportData.payments.forEach(payment => {
      worksheet.addRow([
        formatDate(payment.date),
        `${payment.student?.firstName || ''} ${payment.student?.lastName || ''}`,
        formatCurrency(payment.amount),
        payment.description || ''
      ]);
    });

    worksheet.addRow([]);
  }

  // Detailed expenses section
  if (reportData.expenses && reportData.expenses.length > 0) {
    const expensesHeaderRow = worksheet.addRow(['Tarih', 'Kategori', 'Tutar', 'Açıklama']);
    styleHeaderRow(worksheet, expensesHeaderRow);

    reportData.expenses.forEach(expense => {
      worksheet.addRow([
        formatDate(expense.date),
        getExpenseCategoryLabel(expense.category),
        formatCurrency(expense.amount),
        expense.description || ''
      ]);
    });
  }

  // Auto-size columns
  autoSizeColumns(worksheet);

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }
  });

  return workbook;
};

// Helper functions for labels
const getPaymentMethodLabel = (method) => {
  const labels = {
    cash: 'Nakit',
    credit_card: 'Kredi Kartı',
    bank_transfer: 'Banka Transferi',
    check: 'Çek'
  };
  return labels[method] || method;
};

const getExpenseCategoryLabel = (category) => {
  const labels = {
    salary: 'Maaş',
    rent: 'Kira',
    utilities: 'Faturalar',
    supplies: 'Malzeme',
    marketing: 'Pazarlama',
    maintenance: 'Bakım',
    other: 'Diğer'
  };
  return labels[category] || category;
};

// Comprehensive backup export - ALL DATA in one Excel file
const createComprehensiveBackup = async (data) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FOFORA Tiyatro Yönetim Sistemi';
  workbook.created = new Date();

  // ===== 1. ÖZET (Summary) Sheet =====
  const summarySheet = workbook.addWorksheet('ÖZET');
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'FOFORA TİYATRO - VERİ YEDEĞİ';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF1F4788' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;

  summarySheet.addRow([]);
  summarySheet.addRow(['Yedek Tarihi:', formatDate(new Date()) + ' ' + new Date().toLocaleTimeString('tr-TR')]);
  summarySheet.addRow([]);

  const statsHeaderRow = summarySheet.addRow(['Tablo', 'Kayıt Sayısı', '', '']);
  styleHeaderRow(summarySheet, statsHeaderRow);

  summarySheet.addRow(['Öğrenciler', data.students?.length || 0]);
  summarySheet.addRow(['Eğitmenler', data.instructors?.length || 0]);
  summarySheet.addRow(['Dersler', data.courses?.length || 0]);
  summarySheet.addRow(['Kayıtlar (Enrollment)', data.enrollments?.length || 0]);
  summarySheet.addRow(['Ödeme Planları', data.paymentPlans?.length || 0]);
  summarySheet.addRow(['Ödemeler', data.payments?.length || 0]);
  summarySheet.addRow(['Giderler', data.expenses?.length || 0]);
  summarySheet.addRow(['Kasalar', data.cashRegisters?.length || 0]);
  summarySheet.addRow(['Ders Programları', data.scheduledLessons?.length || 0]);
  summarySheet.addRow(['Yoklama Kayıtları', data.attendances?.length || 0]);
  summarySheet.addRow(['Deneme Dersleri', data.trialLessons?.length || 0]);
  summarySheet.addRow(['Düzenli Giderler', data.recurringExpenses?.length || 0]);

  summarySheet.addRow([]);

  // Financial Summary
  const finHeaderRow = summarySheet.addRow(['FİNANSAL ÖZET', '', '', '']);
  styleHeaderRow(summarySheet, finHeaderRow);

  const totalPayments = (data.payments || [])
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = (data.expenses || [])
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingPayments = (data.paymentPlans || [])
    .reduce((sum, pp) => sum + (pp.remainingAmount || 0), 0);

  summarySheet.addRow(['Toplam Tahsilat:', formatCurrency(totalPayments)]);
  summarySheet.addRow(['Toplam Gider:', formatCurrency(totalExpenses)]);
  summarySheet.addRow(['Net Durum:', formatCurrency(totalPayments - totalExpenses)]);
  summarySheet.addRow(['Bekleyen Alacak:', formatCurrency(pendingPayments)]);

  // Cash register balances
  summarySheet.addRow([]);
  const cashHeaderRow = summarySheet.addRow(['KASA BAKIYELERI', '', '', '']);
  styleHeaderRow(summarySheet, cashHeaderRow);

  (data.cashRegisters || []).forEach(cr => {
    summarySheet.addRow([cr.name, formatCurrency(cr.balance)]);
  });

  autoSizeColumns(summarySheet);

  // ===== 2. ÖĞRENCİLER Sheet =====
  if (data.students && data.students.length > 0) {
    const studentsSheet = workbook.addWorksheet('Öğrenciler');
    studentsSheet.columns = [
      { header: 'ID', key: 'studentId', width: 12 },
      { header: 'Ad', key: 'firstName', width: 15 },
      { header: 'Soyad', key: 'lastName', width: 15 },
      { header: 'TC No', key: 'tcNo', width: 15 },
      { header: 'Doğum Tarihi', key: 'dateOfBirth', width: 12 },
      { header: 'Telefon', key: 'phone', width: 15 },
      { header: 'E-posta', key: 'email', width: 25 },
      { header: 'Adres', key: 'address', width: 30 },
      { header: 'Acil Durum Kişi', key: 'emergencyName', width: 20 },
      { header: 'Acil Durum Tel', key: 'emergencyPhone', width: 15 },
      { header: 'Veli 1 Adı', key: 'parent1Name', width: 20 },
      { header: 'Veli 1 Tel', key: 'parent1Phone', width: 15 },
      { header: 'Bakiye', key: 'balance', width: 12 },
      { header: 'Durum', key: 'status', width: 10 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 },
      { header: 'Kayıt Tarihi', key: 'createdAt', width: 12 }
    ];
    styleHeaderRow(studentsSheet, studentsSheet.getRow(1));

    data.students.forEach(s => {
      const parent1 = s.parentContacts?.[0] || {};
      studentsSheet.addRow({
        studentId: s.studentId || '',
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        tcNo: s.tcNo || '',
        dateOfBirth: formatDate(s.dateOfBirth),
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        emergencyName: s.emergencyContact?.name || '',
        emergencyPhone: s.emergencyContact?.phone || '',
        parent1Name: parent1.name || '',
        parent1Phone: parent1.phone || '',
        balance: s.balance || 0,
        status: s.status === 'active' ? 'Aktif' : s.status === 'passive' ? 'Pasif' : s.status === 'trial' ? 'Deneme' : s.status,
        season: s.season?.name || '',
        institution: s.institution?.name || '',
        notes: s.notes || '',
        createdAt: formatDate(s.createdAt)
      });
    });
    autoSizeColumns(studentsSheet);
    addBordersToSheet(studentsSheet);
  }

  // ===== 3. EĞİTMENLER Sheet =====
  if (data.instructors && data.instructors.length > 0) {
    const instructorsSheet = workbook.addWorksheet('Eğitmenler');
    instructorsSheet.columns = [
      { header: 'Ad', key: 'firstName', width: 15 },
      { header: 'Soyad', key: 'lastName', width: 15 },
      { header: 'TC No', key: 'tcNo', width: 15 },
      { header: 'Telefon', key: 'phone', width: 15 },
      { header: 'E-posta', key: 'email', width: 25 },
      { header: 'Adres', key: 'address', width: 30 },
      { header: 'Ödeme Tipi', key: 'paymentType', width: 15 },
      { header: 'Ödeme Tutarı', key: 'paymentAmount', width: 12 },
      { header: 'Bakiye', key: 'balance', width: 12 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(instructorsSheet, instructorsSheet.getRow(1));

    data.instructors.forEach(i => {
      instructorsSheet.addRow({
        firstName: i.firstName || '',
        lastName: i.lastName || '',
        tcNo: i.tcNo || '',
        phone: i.phone || '',
        email: i.email || '',
        address: i.address || '',
        paymentType: i.paymentType === 'perLesson' ? 'Ders Başı' : i.paymentType === 'monthly' ? 'Aylık' : i.paymentType || '',
        paymentAmount: i.paymentAmount || 0,
        balance: i.balance || 0,
        season: i.season?.name || '',
        institution: i.institution?.name || '',
        notes: i.notes || ''
      });
    });
    autoSizeColumns(instructorsSheet);
    addBordersToSheet(instructorsSheet);
  }

  // ===== 4. DERSLER Sheet =====
  if (data.courses && data.courses.length > 0) {
    const coursesSheet = workbook.addWorksheet('Dersler');
    coursesSheet.columns = [
      { header: 'Ders Adı', key: 'name', width: 25 },
      { header: 'Açıklama', key: 'description', width: 30 },
      { header: 'Fiyatlandırma', key: 'pricingType', width: 15 },
      { header: 'Aylık Ücret', key: 'pricePerMonth', width: 12 },
      { header: 'Ders Başı Ücret', key: 'pricePerLesson', width: 15 },
      { header: 'Haftalık Sıklık', key: 'weeklyFrequency', width: 15 },
      { header: 'Süre (dk)', key: 'duration', width: 12 },
      { header: 'Kapasite', key: 'capacity', width: 10 },
      { header: 'Ücretsiz', key: 'isFree', width: 10 },
      { header: 'Eğitmen', key: 'instructor', width: 20 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 }
    ];
    styleHeaderRow(coursesSheet, coursesSheet.getRow(1));

    data.courses.forEach(c => {
      coursesSheet.addRow({
        name: c.name || '',
        description: c.description || '',
        pricingType: c.pricingType === 'monthly' ? 'Aylık' : c.pricingType === 'perLesson' ? 'Ders Başı' : c.pricingType || '',
        pricePerMonth: c.pricePerMonth || 0,
        pricePerLesson: c.pricePerLesson || 0,
        weeklyFrequency: c.weeklyFrequency || '',
        duration: c.duration || '',
        capacity: c.capacity || '',
        isFree: c.isFree ? 'Evet' : 'Hayır',
        instructor: c.instructor ? `${c.instructor.firstName || ''} ${c.instructor.lastName || ''}`.trim() : '',
        season: c.season?.name || '',
        institution: c.institution?.name || ''
      });
    });
    autoSizeColumns(coursesSheet);
    addBordersToSheet(coursesSheet);
  }

  // ===== 5. KAYITLAR (Enrollments) Sheet =====
  if (data.enrollments && data.enrollments.length > 0) {
    const enrollmentsSheet = workbook.addWorksheet('Ders Kayıtları');
    enrollmentsSheet.columns = [
      { header: 'Öğrenci', key: 'student', width: 25 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Kayıt Tarihi', key: 'enrollmentDate', width: 12 },
      { header: 'Bitiş Tarihi', key: 'endDate', width: 12 },
      { header: 'İndirim Tipi', key: 'discountType', width: 15 },
      { header: 'İndirim Değeri', key: 'discountValue', width: 15 },
      { header: 'İndirim Açıklama', key: 'discountDesc', width: 20 },
      { header: 'Özel Fiyat', key: 'customPrice', width: 12 },
      { header: 'Aktif', key: 'isActive', width: 8 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(enrollmentsSheet, enrollmentsSheet.getRow(1));

    data.enrollments.forEach(e => {
      enrollmentsSheet.addRow({
        student: e.student ? `${e.student.firstName || ''} ${e.student.lastName || ''}`.trim() : '',
        course: e.course?.name || '',
        enrollmentDate: formatDate(e.enrollmentDate),
        endDate: formatDate(e.endDate),
        discountType: e.discount?.type === 'percentage' ? 'Yüzde' : e.discount?.type === 'fixed' ? 'Sabit' : e.discount?.type === 'fullScholarship' ? 'Tam Burs' : e.discount?.type || '',
        discountValue: e.discount?.value || '',
        discountDesc: e.discount?.description || '',
        customPrice: e.customPrice || '',
        isActive: e.isActive ? 'Evet' : 'Hayır',
        season: e.season?.name || '',
        institution: e.institution?.name || '',
        notes: e.notes || ''
      });
    });
    autoSizeColumns(enrollmentsSheet);
    addBordersToSheet(enrollmentsSheet);
  }

  // ===== 6. ÖDEME PLANLARI Sheet =====
  if (data.paymentPlans && data.paymentPlans.length > 0) {
    const plansSheet = workbook.addWorksheet('Ödeme Planları');
    plansSheet.columns = [
      { header: 'Öğrenci', key: 'student', width: 25 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Ödeme Tipi', key: 'paymentType', width: 15 },
      { header: 'Toplam Tutar', key: 'totalAmount', width: 15 },
      { header: 'İndirimli Tutar', key: 'discountedAmount', width: 15 },
      { header: 'Ödenen', key: 'paidAmount', width: 12 },
      { header: 'Kalan', key: 'remainingAmount', width: 12 },
      { header: 'Taksit Sayısı', key: 'installmentCount', width: 12 },
      { header: 'Tamamlandı', key: 'isCompleted', width: 12 },
      { header: 'Dönem Başlangıç', key: 'periodStart', width: 15 },
      { header: 'Dönem Bitiş', key: 'periodEnd', width: 15 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 }
    ];
    styleHeaderRow(plansSheet, plansSheet.getRow(1));

    data.paymentPlans.forEach(pp => {
      plansSheet.addRow({
        student: pp.student ? `${pp.student.firstName || ''} ${pp.student.lastName || ''}`.trim() : '',
        course: pp.course?.name || '',
        paymentType: getPaymentTypeLabel(pp.paymentType),
        totalAmount: pp.totalAmount || 0,
        discountedAmount: pp.discountedAmount || pp.totalAmount || 0,
        paidAmount: pp.paidAmount || 0,
        remainingAmount: pp.remainingAmount || 0,
        installmentCount: pp.installments?.length || 0,
        isCompleted: pp.isCompleted ? 'Evet' : 'Hayır',
        periodStart: formatDate(pp.periodStartDate),
        periodEnd: formatDate(pp.periodEndDate),
        season: pp.season?.name || '',
        institution: pp.institution?.name || ''
      });
    });
    autoSizeColumns(plansSheet);
    addBordersToSheet(plansSheet);
  }

  // ===== 7. TAKSİTLER Sheet (Detailed installments) =====
  if (data.paymentPlans && data.paymentPlans.length > 0) {
    const installmentsSheet = workbook.addWorksheet('Taksitler');
    installmentsSheet.columns = [
      { header: 'Öğrenci', key: 'student', width: 25 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Taksit No', key: 'installmentNo', width: 10 },
      { header: 'Tutar', key: 'amount', width: 12 },
      { header: 'Ödenen', key: 'paidAmount', width: 12 },
      { header: 'Vade Tarihi', key: 'dueDate', width: 12 },
      { header: 'Ödeme Tarihi', key: 'paidDate', width: 12 },
      { header: 'Ödendi Mi', key: 'isPaid', width: 10 },
      { header: 'Durum', key: 'status', width: 12 }
    ];
    styleHeaderRow(installmentsSheet, installmentsSheet.getRow(1));

    data.paymentPlans.forEach(pp => {
      const studentName = pp.student ? `${pp.student.firstName || ''} ${pp.student.lastName || ''}`.trim() : '';
      const courseName = pp.course?.name || '';

      (pp.installments || []).forEach(inst => {
        const isPaid = inst.isPaid;
        const isOverdue = !isPaid && new Date(inst.dueDate) < new Date();

        installmentsSheet.addRow({
          student: studentName,
          course: courseName,
          installmentNo: inst.installmentNumber || '',
          amount: inst.amount || 0,
          paidAmount: inst.paidAmount || 0,
          dueDate: formatDate(inst.dueDate),
          paidDate: formatDate(inst.paidDate),
          isPaid: isPaid ? 'Evet' : 'Hayır',
          status: isPaid ? 'Ödendi' : isOverdue ? 'Gecikmiş' : 'Bekliyor'
        });
      });
    });
    autoSizeColumns(installmentsSheet);
    addBordersToSheet(installmentsSheet);
  }

  // ===== 8. ÖDEMELER Sheet =====
  if (data.payments && data.payments.length > 0) {
    const paymentsSheet = workbook.addWorksheet('Ödemeler');
    paymentsSheet.columns = [
      { header: 'Tarih', key: 'paymentDate', width: 12 },
      { header: 'Öğrenci', key: 'student', width: 25 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Ödeme Yöntemi', key: 'paymentType', width: 15 },
      { header: 'Brüt Tutar', key: 'amount', width: 12 },
      { header: 'Net Tutar', key: 'netAmount', width: 12 },
      { header: 'KDV Oranı', key: 'vatRate', width: 10 },
      { header: 'KDV Tutarı', key: 'vatAmount', width: 12 },
      { header: 'Komisyon Oranı', key: 'commissionRate', width: 12 },
      { header: 'Komisyon Tutarı', key: 'commissionAmount', width: 12 },
      { header: 'Kasa', key: 'cashRegister', width: 15 },
      { header: 'Taksit No', key: 'installmentNo', width: 10 },
      { header: 'Durum', key: 'status', width: 12 },
      { header: 'Fatura No', key: 'invoiceNo', width: 15 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(paymentsSheet, paymentsSheet.getRow(1));

    data.payments.forEach(p => {
      paymentsSheet.addRow({
        paymentDate: formatDate(p.paymentDate),
        student: p.student ? `${p.student.firstName || ''} ${p.student.lastName || ''}`.trim() : '',
        course: p.course?.name || '',
        paymentType: p.paymentType === 'cash' ? 'Nakit' : p.paymentType === 'creditCard' ? 'Kredi Kartı' : p.paymentType || '',
        amount: p.amount || 0,
        netAmount: p.netAmount || p.amount || 0,
        vatRate: p.vat?.rate || 0,
        vatAmount: p.vat?.amount || 0,
        commissionRate: p.creditCardCommission?.rate || 0,
        commissionAmount: p.creditCardCommission?.amount || 0,
        cashRegister: p.cashRegister?.name || '',
        installmentNo: p.installmentNumber || '',
        status: p.status === 'completed' ? 'Tamamlandı' : p.status === 'pending' ? 'Beklemede' : p.status === 'refunded' ? 'İade' : p.status || '',
        invoiceNo: p.invoiceNumber || '',
        season: p.season?.name || '',
        institution: p.institution?.name || '',
        notes: p.notes || ''
      });
    });
    autoSizeColumns(paymentsSheet);
    addBordersToSheet(paymentsSheet);
  }

  // ===== 9. GİDERLER Sheet =====
  if (data.expenses && data.expenses.length > 0) {
    const expensesSheet = workbook.addWorksheet('Giderler');
    expensesSheet.columns = [
      { header: 'Tarih', key: 'expenseDate', width: 12 },
      { header: 'Vade Tarihi', key: 'dueDate', width: 12 },
      { header: 'Kategori', key: 'category', width: 15 },
      { header: 'Açıklama', key: 'description', width: 35 },
      { header: 'Tutar', key: 'amount', width: 12 },
      { header: 'Tahmini Tutar', key: 'estimatedAmount', width: 12 },
      { header: 'Durum', key: 'status', width: 12 },
      { header: 'Kasa', key: 'cashRegister', width: 15 },
      { header: 'Eğitmen', key: 'instructor', width: 20 },
      { header: 'Fatura Var', key: 'hasInvoice', width: 10 },
      { header: 'Fatura No', key: 'invoiceNo', width: 15 },
      { header: 'Otomatik', key: 'isAutoGenerated', width: 10 },
      { header: 'Düzenli Gider', key: 'recurringExpense', width: 20 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(expensesSheet, expensesSheet.getRow(1));

    data.expenses.forEach(e => {
      expensesSheet.addRow({
        expenseDate: formatDate(e.expenseDate),
        dueDate: formatDate(e.dueDate),
        category: getExpenseCategoryLabel(e.category),
        description: e.description || '',
        amount: e.amount || 0,
        estimatedAmount: e.estimatedAmount || '',
        status: e.status === 'paid' ? 'Ödendi' : e.status === 'pending' ? 'Beklemede' : e.status === 'overdue' ? 'Gecikmiş' : e.status || '',
        cashRegister: e.cashRegister?.name || '',
        instructor: e.instructor ? `${e.instructor.firstName || ''} ${e.instructor.lastName || ''}`.trim() : '',
        hasInvoice: e.invoice?.hasInvoice ? 'Evet' : 'Hayır',
        invoiceNo: e.invoice?.invoiceNumber || '',
        isAutoGenerated: e.isAutoGenerated ? 'Evet' : 'Hayır',
        recurringExpense: e.recurringExpense?.title || '',
        season: e.season?.name || '',
        institution: e.institution?.name || '',
        notes: e.notes || ''
      });
    });
    autoSizeColumns(expensesSheet);
    addBordersToSheet(expensesSheet);
  }

  // ===== 10. KASALAR Sheet =====
  if (data.cashRegisters && data.cashRegisters.length > 0) {
    const cashSheet = workbook.addWorksheet('Kasalar');
    cashSheet.columns = [
      { header: 'Kasa Adı', key: 'name', width: 20 },
      { header: 'Başlangıç Bakiye', key: 'initialBalance', width: 15 },
      { header: 'Güncel Bakiye', key: 'balance', width: 15 },
      { header: 'Açıklama', key: 'description', width: 30 },
      { header: 'Aktif', key: 'isActive', width: 10 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 }
    ];
    styleHeaderRow(cashSheet, cashSheet.getRow(1));

    data.cashRegisters.forEach(cr => {
      cashSheet.addRow({
        name: cr.name || '',
        initialBalance: cr.initialBalance || 0,
        balance: cr.balance || 0,
        description: cr.description || '',
        isActive: cr.isActive ? 'Evet' : 'Hayır',
        season: cr.season?.name || '',
        institution: cr.institution?.name || ''
      });
    });
    autoSizeColumns(cashSheet);
    addBordersToSheet(cashSheet);
  }

  // ===== 11. DERS PROGRAMLARI Sheet =====
  if (data.scheduledLessons && data.scheduledLessons.length > 0) {
    const lessonsSheet = workbook.addWorksheet('Ders Programları');
    lessonsSheet.columns = [
      { header: 'Tarih', key: 'date', width: 12 },
      { header: 'Başlangıç', key: 'startTime', width: 10 },
      { header: 'Bitiş', key: 'endTime', width: 10 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Öğrenci', key: 'student', width: 25 },
      { header: 'Eğitmen', key: 'instructor', width: 20 },
      { header: 'Ek Eğitmenler', key: 'additionalInstructors', width: 25 },
      { header: 'Durum', key: 'status', width: 12 },
      { header: 'Süre (dk)', key: 'actualDuration', width: 10 },
      { header: 'Eğitmen Ücreti', key: 'instructorPayment', width: 12 },
      { header: 'Ücret Ödendi', key: 'paymentPaid', width: 12 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(lessonsSheet, lessonsSheet.getRow(1));

    data.scheduledLessons.forEach(sl => {
      const additionalInstructorNames = (sl.additionalInstructors || [])
        .map(ai => ai.instructor ? `${ai.instructor.firstName || ''} ${ai.instructor.lastName || ''}`.trim() : '')
        .filter(n => n)
        .join(', ');

      lessonsSheet.addRow({
        date: formatDate(sl.date),
        startTime: sl.startTime || '',
        endTime: sl.endTime || '',
        course: sl.course?.name || '',
        student: sl.student ? `${sl.student.firstName || ''} ${sl.student.lastName || ''}`.trim() : '',
        instructor: sl.instructor ? `${sl.instructor.firstName || ''} ${sl.instructor.lastName || ''}`.trim() : '',
        additionalInstructors: additionalInstructorNames,
        status: sl.status === 'scheduled' ? 'Planlandı' : sl.status === 'completed' ? 'Tamamlandı' : sl.status === 'cancelled' ? 'İptal' : sl.status === 'postponed' ? 'Ertelendi' : sl.status || '',
        actualDuration: sl.actualDuration || '',
        instructorPayment: sl.instructorPaymentAmount || 0,
        paymentPaid: sl.instructorPaymentPaid ? 'Evet' : 'Hayır',
        season: sl.season?.name || '',
        institution: sl.institution?.name || '',
        notes: sl.notes || ''
      });
    });
    autoSizeColumns(lessonsSheet);
    addBordersToSheet(lessonsSheet);
  }

  // ===== 12. YOKLAMA Sheet =====
  if (data.attendances && data.attendances.length > 0) {
    const attendanceSheet = workbook.addWorksheet('Yoklama');
    attendanceSheet.columns = [
      { header: 'Tarih', key: 'date', width: 12 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Öğrenci', key: 'student', width: 25 },
      { header: 'Katıldı', key: 'attended', width: 10 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(attendanceSheet, attendanceSheet.getRow(1));

    data.attendances.forEach(a => {
      attendanceSheet.addRow({
        date: formatDate(a.scheduledLesson?.date),
        course: a.scheduledLesson?.course?.name || '',
        student: a.student ? `${a.student.firstName || ''} ${a.student.lastName || ''}`.trim() : '',
        attended: a.attended ? 'Evet' : 'Hayır',
        notes: a.notes || ''
      });
    });
    autoSizeColumns(attendanceSheet);
    addBordersToSheet(attendanceSheet);
  }

  // ===== 13. DENEME DERSLERİ Sheet =====
  if (data.trialLessons && data.trialLessons.length > 0) {
    const trialSheet = workbook.addWorksheet('Deneme Dersleri');
    trialSheet.columns = [
      { header: 'Ad', key: 'firstName', width: 15 },
      { header: 'Soyad', key: 'lastName', width: 15 },
      { header: 'Telefon', key: 'phone', width: 15 },
      { header: 'E-posta', key: 'email', width: 25 },
      { header: 'Ders', key: 'course', width: 25 },
      { header: 'Eğitmen', key: 'instructor', width: 20 },
      { header: 'Tarih', key: 'scheduledDate', width: 12 },
      { header: 'Saat', key: 'scheduledTime', width: 10 },
      { header: 'Durum', key: 'status', width: 12 },
      { header: 'Katıldı', key: 'attended', width: 10 },
      { header: 'Kayıt Oldu', key: 'converted', width: 12 },
      { header: 'Kayıt İlgi', key: 'interested', width: 12 },
      { header: 'Referans', key: 'referral', width: 15 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(trialSheet, trialSheet.getRow(1));

    data.trialLessons.forEach(t => {
      trialSheet.addRow({
        firstName: t.firstName || '',
        lastName: t.lastName || '',
        phone: t.phone || '',
        email: t.email || '',
        course: t.course?.name || '',
        instructor: t.instructor ? `${t.instructor.firstName || ''} ${t.instructor.lastName || ''}`.trim() : '',
        scheduledDate: formatDate(t.scheduledDate),
        scheduledTime: t.scheduledTime || '',
        status: t.status === 'pending' ? 'Beklemede' : t.status === 'completed' ? 'Tamamlandı' : t.status === 'cancelled' ? 'İptal' : t.status === 'converted' ? 'Kayıt Oldu' : t.status || '',
        attended: t.attended ? 'Evet' : 'Hayır',
        converted: t.convertedToStudent ? 'Evet' : 'Hayır',
        interested: t.interestedInEnrollment ? 'Evet' : 'Hayır',
        referral: t.referralSource || '',
        season: t.season?.name || '',
        institution: t.institution?.name || '',
        notes: t.notes || ''
      });
    });
    autoSizeColumns(trialSheet);
    addBordersToSheet(trialSheet);
  }

  // ===== 14. DÜZENLİ GİDERLER Sheet =====
  if (data.recurringExpenses && data.recurringExpenses.length > 0) {
    const recurringSheet = workbook.addWorksheet('Düzenli Giderler');
    recurringSheet.columns = [
      { header: 'Başlık', key: 'title', width: 25 },
      { header: 'Kategori', key: 'category', width: 15 },
      { header: 'Açıklama', key: 'description', width: 30 },
      { header: 'Tutar Tipi', key: 'amountType', width: 12 },
      { header: 'Tahmini Tutar', key: 'estimatedAmount', width: 12 },
      { header: 'Sıklık', key: 'frequency', width: 12 },
      { header: 'Vade Günü', key: 'dueDay', width: 10 },
      { header: 'Başlangıç', key: 'startDate', width: 12 },
      { header: 'Bitiş', key: 'endDate', width: 12 },
      { header: 'Varsayılan Kasa', key: 'defaultCashRegister', width: 15 },
      { header: 'Eğitmen', key: 'instructor', width: 20 },
      { header: 'Aktif', key: 'isActive', width: 10 },
      { header: 'Dönem', key: 'season', width: 15 },
      { header: 'Kurum', key: 'institution', width: 20 },
      { header: 'Notlar', key: 'notes', width: 30 }
    ];
    styleHeaderRow(recurringSheet, recurringSheet.getRow(1));

    data.recurringExpenses.forEach(r => {
      recurringSheet.addRow({
        title: r.title || '',
        category: getExpenseCategoryLabel(r.category),
        description: r.description || '',
        amountType: r.amountType === 'fixed' ? 'Sabit' : r.amountType === 'variable' ? 'Değişken' : r.amountType || '',
        estimatedAmount: r.estimatedAmount || 0,
        frequency: r.frequency === 'monthly' ? 'Aylık' : r.frequency === 'quarterly' ? '3 Aylık' : r.frequency === 'yearly' ? 'Yıllık' : r.frequency || '',
        dueDay: r.dueDay || '',
        startDate: formatDate(r.startDate),
        endDate: formatDate(r.endDate),
        defaultCashRegister: r.defaultCashRegister?.name || '',
        instructor: r.instructor ? `${r.instructor.firstName || ''} ${r.instructor.lastName || ''}`.trim() : '',
        isActive: r.isActive ? 'Evet' : 'Hayır',
        season: r.season?.name || '',
        institution: r.institution?.name || '',
        notes: r.notes || ''
      });
    });
    autoSizeColumns(recurringSheet);
    addBordersToSheet(recurringSheet);
  }

  // ===== 15. KURUMLAR Sheet =====
  if (data.institutions && data.institutions.length > 0) {
    const instSheet = workbook.addWorksheet('Kurumlar');
    instSheet.columns = [
      { header: 'Kurum Adı', key: 'name', width: 25 },
      { header: 'Adres', key: 'address', width: 35 },
      { header: 'Telefon', key: 'phone', width: 15 },
      { header: 'E-posta', key: 'email', width: 25 },
      { header: 'Vergi No', key: 'taxNumber', width: 15 },
      { header: 'Vergi Dairesi', key: 'taxOffice', width: 20 },
      { header: 'Website', key: 'website', width: 25 }
    ];
    styleHeaderRow(instSheet, instSheet.getRow(1));

    data.institutions.forEach(i => {
      instSheet.addRow({
        name: i.name || '',
        address: i.address || '',
        phone: i.phone || '',
        email: i.email || '',
        taxNumber: i.taxNumber || '',
        taxOffice: i.taxOffice || '',
        website: i.website || ''
      });
    });
    autoSizeColumns(instSheet);
    addBordersToSheet(instSheet);
  }

  // ===== 16. DÖNEMLER Sheet =====
  if (data.seasons && data.seasons.length > 0) {
    const seasonsSheet = workbook.addWorksheet('Dönemler');
    seasonsSheet.columns = [
      { header: 'Dönem Adı', key: 'name', width: 25 },
      { header: 'Başlangıç', key: 'startDate', width: 12 },
      { header: 'Bitiş', key: 'endDate', width: 12 },
      { header: 'Aktif', key: 'isActive', width: 10 },
      { header: 'Kurum', key: 'institution', width: 25 }
    ];
    styleHeaderRow(seasonsSheet, seasonsSheet.getRow(1));

    data.seasons.forEach(s => {
      seasonsSheet.addRow({
        name: s.name || '',
        startDate: formatDate(s.startDate),
        endDate: formatDate(s.endDate),
        isActive: s.isActive ? 'Evet' : 'Hayır',
        institution: s.institution?.name || ''
      });
    });
    autoSizeColumns(seasonsSheet);
    addBordersToSheet(seasonsSheet);
  }

  return workbook;
};

// Helper function to add borders to all cells in a sheet
const addBordersToSheet = (worksheet) => {
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
};

// Helper for payment type labels
const getPaymentTypeLabel = (type) => {
  const labels = {
    cashFull: 'Peşin Nakit',
    cashInstallment: 'Taksitli Nakit',
    creditCard: 'Kredi Kartı',
    mixed: 'Karışık'
  };
  return labels[type] || type || '';
};

module.exports = {
  exportStudentsToExcel,
  exportPaymentsToExcel,
  exportExpensesToExcel,
  exportReportToExcel,
  createComprehensiveBackup,
  formatDate,
  formatCurrency,
  styleHeaderRow,
  autoSizeColumns,
  addBordersToSheet
};
