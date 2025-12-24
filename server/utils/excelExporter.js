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

module.exports = {
  exportStudentsToExcel,
  exportPaymentsToExcel,
  exportExpensesToExcel,
  exportReportToExcel
};
