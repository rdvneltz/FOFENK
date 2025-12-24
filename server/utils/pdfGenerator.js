const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Font paths for Turkish character support
const FONT_REGULAR = path.join(__dirname, '../assets/fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.join(__dirname, '../assets/fonts/NotoSans-Bold.ttf');

/**
 * Format currency for display in PDF
 */
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  return `₺${Math.round(amount).toLocaleString('tr-TR')}`;
};

/**
 * Turkey timezone offset (UTC+3) in milliseconds
 * Needed because dates stored in MongoDB as UTC need adjustment
 * "Nov 1 midnight Turkey" is stored as "Oct 31 21:00 UTC"
 */
const TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Format date in Turkish format with timezone adjustment
 * This prevents dates like "1 November" from showing as "31 October"
 */
const formatDateTR = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  // Add Turkey timezone offset to get original local date
  const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
  const day = adjusted.getUTCDate().toString().padStart(2, '0');
  const month = (adjusted.getUTCMonth() + 1).toString().padStart(2, '0');
  const year = adjusted.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Format month and year in Turkish with timezone adjustment
 */
const formatMonthYearTR = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  // Add Turkey timezone offset to get original local date
  const adjusted = new Date(d.getTime() + TURKEY_OFFSET_MS);
  const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
                  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
  return `${months[adjusted.getUTCMonth()]} ${adjusted.getUTCFullYear()}`;
};

/**
 * Register fonts and return font names
 */
const registerFonts = (doc) => {
  // Check if fonts exist, otherwise fall back to Helvetica
  if (fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD)) {
    doc.registerFont('Regular', FONT_REGULAR);
    doc.registerFont('Bold', FONT_BOLD);
    return { regular: 'Regular', bold: 'Bold' };
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
};

/**
 * Ödeme planı PDF'i oluşturur
 * @param {Object} paymentPlan - Ödeme planı bilgileri
 * @param {Object} student - Öğrenci bilgileri
 * @param {Object} course - Ders bilgileri
 * @param {Object} institution - Kurum bilgileri
 * @param {String} outputPath - PDF dosyasının kaydedileceği yol
 */
const generatePaymentPlanPDF = (paymentPlan, student, course, institution, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(outputPath);
      const fonts = registerFonts(doc);

      doc.pipe(writeStream);

      // Antetli kağıt varsa ekle
      if (institution.letterhead && fs.existsSync(institution.letterhead)) {
        doc.image(institution.letterhead, 0, 0, {
          width: doc.page.width,
          height: 150
        });
      } else if (institution.logo && fs.existsSync(institution.logo)) {
        // Logo varsa ekle
        doc.image(institution.logo, 50, 45, { width: 100 });
      }

      // Kurum bilgileri
      doc.font(fonts.bold).fontSize(20).text(institution.name, { align: 'center' });
      doc.font(fonts.regular).fontSize(10).text(institution.address || '', { align: 'center' });
      doc.text(`Tel: ${institution.phone || ''}`, { align: 'center' });
      doc.moveDown(2);

      // Başlık
      doc.font(fonts.bold).fontSize(16).text('ÖDEME PLANI', { align: 'center', underline: true });
      doc.moveDown(2);

      // Öğrenci ve ders bilgileri
      doc.font(fonts.regular).fontSize(12);
      doc.text(`Öğrenci: ${student.firstName} ${student.lastName}`);
      doc.text(`Ders: ${course.name}`);
      doc.text(`Ödeme Tipi: ${getPaymentTypeText(paymentPlan.paymentType)}`);
      doc.moveDown();

      // Toplam tutar bilgileri
      doc.text(`Toplam Tutar: ${paymentPlan.totalAmount.toFixed(2)} TL`);

      if (paymentPlan.discountedAmount < paymentPlan.totalAmount) {
        doc.text(`İndirimli Tutar: ${paymentPlan.discountedAmount.toFixed(2)} TL`);
      }

      if (paymentPlan.creditCardCommission && paymentPlan.creditCardCommission.amount > 0) {
        doc.text(`Kredi Kartı Komisyonu (%${paymentPlan.creditCardCommission.rate}): ${paymentPlan.creditCardCommission.amount.toFixed(2)} TL`);
      }

      if (paymentPlan.vat && paymentPlan.vat.amount > 0 && paymentPlan.isInvoiced) {
        doc.text(`KDV (%${paymentPlan.vat.rate}): ${paymentPlan.vat.amount.toFixed(2)} TL`);
      }

      doc.moveDown();

      // Taksit tablosu
      if (paymentPlan.installments && paymentPlan.installments.length > 0) {
        doc.fontSize(14).text('TAKSİT PLANI', { underline: true });
        doc.moveDown();

        // Tablo başlıkları
        const tableTop = doc.y;
        const tableLeft = 50;
        const col1 = tableLeft;
        const col2 = tableLeft + 100;
        const col3 = tableLeft + 250;
        const col4 = tableLeft + 400;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Taksit No', col1, tableTop);
        doc.text('Vade Tarihi', col2, tableTop);
        doc.text('Tutar', col3, tableTop);
        doc.text('Durum', col4, tableTop);

        doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + 500, tableTop + 15).stroke();

        // Taksitler
        doc.font('Helvetica');
        let currentY = tableTop + 25;

        paymentPlan.installments.forEach((installment, index) => {
          const paidAmount = installment.paidAmount || 0;
          const totalAmount = installment.amount || 0;
          const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount;

          doc.text(installment.installmentNumber.toString(), col1, currentY);
          doc.text(formatDateTR(installment.dueDate), col2, currentY);

          // Show amount with partial payment info
          if (isPartiallyPaid) {
            doc.text(`${paidAmount.toFixed(2)} / ${totalAmount.toFixed(2)} TL`, col3, currentY);
          } else {
            doc.text(`${totalAmount.toFixed(2)} TL`, col3, currentY);
          }

          // Show status
          const status = installment.isPaid ? 'Ödendi' : isPartiallyPaid ? 'Kısmi' : 'Bekliyor';
          doc.text(status, col4, currentY);
          currentY += 20;
        });

        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + 500, currentY).stroke();
      }

      doc.moveDown(2);

      // Alt bilgi
      doc.fontSize(10).text(`Olusturma Tarihi: ${formatDateTR(new Date())}`, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Ödeme tipi metnini döndürür
 */
const getPaymentTypeText = (type) => {
  const types = {
    cashFull: 'Nakit Peşin',
    cashInstallment: 'Nakit Taksitli',
    creditCard: 'Kredi Kartı'
  };
  return types[type] || type;
};

/**
 * Öğrenci Son Durum Raporu PDF'i oluşturur
 * @param {Object} data - Rapor verileri
 * @param {Object} data.student - Öğrenci bilgileri
 * @param {Object} data.institution - Kurum bilgileri
 * @param {Array} data.paymentPlans - Ödeme planları
 * @param {Array} data.attendanceByMonth - Aylık katılım bilgileri
 * @param {Object} data.letterhead - Antetli kağıt ayarları
 * @param {String} outputPath - PDF dosyasının kaydedileceği yol
 */
const generateStudentStatusReportPDF = (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const { student, institution, paymentPlans, letterhead } = data;

      // Margin settings from letterhead or defaults
      const topMargin = letterhead?.topMargin || 120;
      const bottomMargin = letterhead?.bottomMargin || 60;
      const sideMargin = letterhead?.sideMargin || 40;

      const doc = new PDFDocument({
        margin: sideMargin,
        size: 'A4'
      });

      const writeStream = fs.createWriteStream(outputPath);
      const fonts = registerFonts(doc);
      doc.pipe(writeStream);

      // If letterhead image exists, draw it as background
      if (letterhead?.imageUrl && letterhead.imageUrl.startsWith('data:image')) {
        const base64Data = letterhead.imageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height
        });
      }

      // Move to start position after letterhead area
      doc.y = topMargin;

      // Report title
      doc.fontSize(16).font(fonts.bold)
        .text('ÖĞRENCİ KAYIT DURUM RAPORU', sideMargin, doc.y, { align: 'center' });
      doc.moveDown(0.5);

      // Generation date
      doc.fontSize(9).font(fonts.regular)
        .text(`Rapor Tarihi: ${formatDateTR(new Date())}`, { align: 'center' });
      doc.moveDown(1.5);

      // Student info box
      doc.fontSize(11).font(fonts.bold)
        .text('ÖĞRENCİ BİLGİLERİ', sideMargin);
      doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font(fonts.regular);
      doc.text(`Ad Soyad: ${student.firstName} ${student.lastName}`);
      if (student.phone) doc.text(`Telefon: ${student.phone}`);
      if (student.email) doc.text(`E-posta: ${student.email}`);
      if (student.parentContacts && student.parentContacts.length > 0) {
        const parent = student.parentContacts[0];
        doc.text(`Veli: ${parent.name} (${parent.relationship}) - ${parent.phone}`);
      }
      doc.moveDown(1.5);

      // Process each payment plan
      if (paymentPlans && paymentPlans.length > 0) {
        paymentPlans.forEach((planData, planIndex) => {
          const { paymentPlan, course, monthlyBreakdown, enrollment } = planData;

          // Check if we need a new page
          if (doc.y > doc.page.height - bottomMargin - 250) {
            doc.addPage();
            doc.y = topMargin;
            // Re-draw letterhead on new page
            if (letterhead?.imageUrl && letterhead.imageUrl.startsWith('data:image')) {
              const base64Data = letterhead.imageUrl.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');
              doc.image(imageBuffer, 0, 0, {
                width: doc.page.width,
                height: doc.page.height
              });
            }
          }

          // Course header
          doc.fontSize(11).font(fonts.bold)
            .text(`${planIndex + 1}. KURS: ${course?.name || 'Bilinmiyor'}`, sideMargin);
          doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
          doc.moveDown(0.5);

          doc.fontSize(10).font(fonts.regular);
          // Use payment plan's period dates first, then fall back to enrollment dates
          const periodStart = paymentPlan.periodStartDate || enrollment?.enrollmentDate;
          const periodEnd = paymentPlan.periodEndDate || enrollment?.endDate;

          if (periodStart) {
            const startDate = new Date(periodStart);
            if (!isNaN(startDate.getTime())) {
              // Use UTC-based formatting to avoid timezone issues (1 Nov -> 31 Oct bug)
              doc.text(`Kayit Tarihi: ${formatDateTR(periodStart)}`);
              const startMonth = formatMonthYearTR(periodStart);
              const endMonth = periodEnd ? formatMonthYearTR(periodEnd) : 'Devam Ediyor';
              doc.text(`Kayit Donemi: ${startMonth} - ${endMonth}`);
            }
          }
          doc.moveDown(0.5);

          // Lesson details header
          const { lessonDetails } = planData;
          if (lessonDetails) {
            doc.fontSize(10).font(fonts.bold)
              .text('Ders Detaylari', sideMargin, doc.y, { continued: true })
              .font(fonts.regular);

            if (lessonDetails.isBirebir) {
              // Birebir: show only per-lesson fee
              doc.text(` (Birebir) - Ders Basi: ${formatCurrency(lessonDetails.perLessonFee)} | ${lessonDetails.totalLessons} ders`);
            } else {
              // Group: show monthly and per-lesson fee
              doc.text(` - Aylik: ${formatCurrency(lessonDetails.monthlyFee)} | Ders Basi: ${formatCurrency(lessonDetails.perLessonFee)}`);
            }
            doc.moveDown(0.5);
          }

          // Monthly breakdown table
          if (monthlyBreakdown && monthlyBreakdown.length > 0) {
            const hasDiscount = lessonDetails?.hasDiscount;

            // Table headers
            const tableLeft = sideMargin;
            const col1Width = 150;
            const col2Width = 70;
            const col3Width = hasDiscount ? 160 : 100; // Wider for discount display
            const tableWidth = doc.page.width - (sideMargin * 2);

            doc.fontSize(9).font(fonts.bold);
            let tableY = doc.y;
            doc.text('Ay', tableLeft, tableY);
            doc.text('Ders', tableLeft + col1Width, tableY);
            doc.text('Ucret', tableLeft + col1Width + col2Width, tableY);

            doc.moveTo(tableLeft, tableY + 12).lineTo(tableLeft + tableWidth, tableY + 12).stroke();

            doc.font(fonts.regular);
            tableY += 18;

            let totalLessonCount = 0;
            let totalDiscountedAmount = 0;

            monthlyBreakdown.forEach((month) => {
              if (tableY > doc.page.height - bottomMargin - 50) {
                doc.addPage();
                tableY = topMargin;
              }

              // Month name with "(Kismi)" label if partial
              const monthLabel = month.isPartial ? `${month.monthName} (Kismi)` : month.monthName;
              doc.fillColor('black').text(monthLabel, tableLeft, tableY);
              doc.text(`${month.lessonCount} ders`, tableLeft + col1Width, tableY);

              // Price column: show strikethrough original + green discounted if has discount
              if (hasDiscount && month.discountedAmount !== undefined) {
                // Strikethrough original price
                doc.fillColor('gray')
                  .text(formatCurrency(month.amount), tableLeft + col1Width + col2Width, tableY, {
                    strike: true,
                    continued: true
                  });
                // Green discounted price
                doc.fillColor('green')
                  .text(` ${formatCurrency(month.discountedAmount)}`, { strike: false });
                doc.fillColor('black');
                totalDiscountedAmount += month.discountedAmount;
              } else {
                doc.text(formatCurrency(month.amount), tableLeft + col1Width + col2Width, tableY);
              }

              tableY += 15;
              totalLessonCount += month.lessonCount;
            });

            doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke();

            // Total lessons row
            tableY += 5;
            doc.font(fonts.bold).fillColor('black');
            if (hasDiscount) {
              doc.text(`Toplam: ${totalLessonCount} ders`, tableLeft, tableY, { continued: true });
              doc.fillColor('green').text(` = ${formatCurrency(totalDiscountedAmount)}`);
              doc.fillColor('black');
            } else {
              doc.text(`Toplam: ${totalLessonCount} ders`, tableLeft, tableY);
            }
            doc.y = tableY + 15;
          }

          doc.moveDown(0.5);

          // Total amount section
          doc.fontSize(10).font(fonts.bold);
          const totalAmount = paymentPlan.totalAmount || 0;
          // IMPORTANT: Use explicit check for discountedAmount because 0 is valid for full scholarship!
          const discountedAmount = paymentPlan.discountedAmount !== undefined && paymentPlan.discountedAmount !== null
            ? paymentPlan.discountedAmount
            : totalAmount;
          const hasDiscount = discountedAmount < totalAmount;
          const isFullScholarship = discountedAmount === 0 || paymentPlan.discountType === 'fullScholarship';

          doc.text(`Toplam Tutar: ${formatCurrency(totalAmount)}`);

          if (isFullScholarship) {
            // Full scholarship - show special banner
            doc.fillColor('green')
              .text('%100 TAM BURSLU');
            doc.fillColor('black');
          } else if (hasDiscount && lessonDetails) {
            const discountPercent = Math.round((1 - discountedAmount / totalAmount) * 100);
            doc.fillColor('green')
              .text(`%${discountPercent} Indirimli Tutar: ${formatCurrency(discountedAmount)}`);
            doc.fillColor('black');

            // After-discount per-lesson and monthly calculations
            doc.fontSize(9).font(fonts.regular);
            if (lessonDetails.totalLessons > 0) {
              doc.text(`Indirimli Aylik: ${formatCurrency(lessonDetails.discountedMonthlyFee)} | Indirimli Ders Basi: ${formatCurrency(lessonDetails.discountedPerLessonFee)}`);
            }
          }

          doc.moveDown(1);

          // Payment plan installments
          if (paymentPlan.installments && paymentPlan.installments.length > 0) {
            doc.fontSize(10).font(fonts.bold).text('Ödeme Planı:');
            doc.moveDown(0.3);

            const instTableLeft = sideMargin;
            let instY = doc.y;

            doc.fontSize(9).font(fonts.bold);
            doc.text('Taksit', instTableLeft, instY);
            doc.text('Vade Tarihi', instTableLeft + 60, instY);
            doc.text('Tutar', instTableLeft + 160, instY);
            doc.text('Durum', instTableLeft + 260, instY);
            doc.text('Ödeme Tarihi', instTableLeft + 340, instY);

            doc.moveTo(instTableLeft, instY + 12).lineTo(doc.page.width - sideMargin, instY + 12).stroke();

            doc.font(fonts.regular);
            instY += 18;

            paymentPlan.installments.forEach((inst, idx) => {
              if (instY > doc.page.height - bottomMargin - 30) {
                doc.addPage();
                instY = topMargin;
              }

              const isPaid = inst.isPaid;
              const paidAmount = inst.paidAmount || 0;
              const totalAmount = inst.amount || 0;
              const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount;

              doc.text(`${idx + 1}. Taksit`, instTableLeft, instY);
              doc.text(formatDateTR(inst.dueDate), instTableLeft + 60, instY);

              if (isPaid) {
                // Fully paid - show strikethrough and green "ÖDENDİ"
                doc.fillColor('gray').text(`₺${totalAmount.toLocaleString('tr-TR')}`, instTableLeft + 160, instY, { strike: true });
                doc.fillColor('green').text('ODENDI', instTableLeft + 260, instY);
                doc.fillColor('black');
                if (inst.paidDate) {
                  doc.text(formatDateTR(inst.paidDate), instTableLeft + 340, instY);
                }
              } else if (isPartiallyPaid) {
                // Partially paid - show paid/total and "KISMİ" in blue
                const remaining = totalAmount - paidAmount;
                doc.text(`₺${paidAmount.toLocaleString('tr-TR')} / ₺${totalAmount.toLocaleString('tr-TR')}`, instTableLeft + 160, instY);
                doc.fillColor('blue').text('KISMİ', instTableLeft + 260, instY);
                doc.fillColor('red').fontSize(8).text(`Kalan: ₺${remaining.toLocaleString('tr-TR')}`, instTableLeft + 310, instY);
                doc.fillColor('black').fontSize(10);
              } else {
                // Not paid - show amount and status
                doc.text(`₺${totalAmount.toLocaleString('tr-TR')}`, instTableLeft + 160, instY);
                const isOverdue = new Date(inst.dueDate) < new Date();
                doc.fillColor(isOverdue ? 'red' : 'orange')
                  .text(isOverdue ? 'GECİKMİŞ' : 'BEKLİYOR', instTableLeft + 260, instY);
                doc.fillColor('black');
              }
              instY += 15;
            });

            doc.moveTo(instTableLeft, instY).lineTo(doc.page.width - sideMargin, instY).stroke();
            doc.y = instY + 10;
          }

          // Remaining balance - handle full scholarship differently
          const paidAmount = paymentPlan.paidAmount || 0;
          const remainingAmount = discountedAmount - paidAmount;

          if (isFullScholarship) {
            // Full scholarship - no debt, show special message with watermark effect
            doc.fontSize(12).font(fonts.bold)
              .fillColor('green')
              .text('✓ TAM BURSLU - BORCU YOKTUR', { align: 'right' });
            doc.fillColor('black');
          } else if (remainingAmount > 0) {
            doc.fontSize(10).font(fonts.bold)
              .fillColor('red')
              .text(`Kalan Borç: ₺${remainingAmount.toLocaleString('tr-TR')}`);
            doc.fillColor('black');
          } else {
            doc.fontSize(10).font(fonts.bold)
              .fillColor('green')
              .text('TÜM ÖDEMELER TAMAMLANMIŞTIR');
            doc.fillColor('black');
          }

          doc.moveDown(2);
        });
      } else {
        doc.text('Bu öğrenci için aktif ödeme planı bulunmamaktadır.');
      }

      // Footer - add page numbers
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).font(fonts.regular)
          .text(
            `${institution.name} - Sayfa ${i + 1}/${range.count}`,
            sideMargin,
            doc.page.height - bottomMargin + 10,
            { align: 'center', width: doc.page.width - (sideMargin * 2) }
          );
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Yoklama Geçmişi Raporu PDF'i oluşturur
 * @param {Object} data - Rapor verileri
 * @param {Object} data.student - Öğrenci bilgileri
 * @param {Object} data.institution - Kurum bilgileri
 * @param {Array} data.attendanceRecords - Yoklama kayıtları
 * @param {Object} data.summary - Özet istatistikler
 * @param {Object} data.letterhead - Antetli kağıt ayarları
 * @param {String} outputPath - PDF dosyasının kaydedileceği yol
 */
const generateAttendanceHistoryPDF = (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const { student, institution, attendanceRecords, summary, letterhead } = data;

      // Margin settings from letterhead or defaults
      const topMargin = letterhead?.topMargin || 120;
      const bottomMargin = letterhead?.bottomMargin || 60;
      const sideMargin = letterhead?.sideMargin || 40;

      const doc = new PDFDocument({
        margin: sideMargin,
        size: 'A4'
      });

      const writeStream = fs.createWriteStream(outputPath);
      const fonts = registerFonts(doc);
      doc.pipe(writeStream);

      // If letterhead image exists, draw it as background
      if (letterhead?.imageUrl && letterhead.imageUrl.startsWith('data:image')) {
        const base64Data = letterhead.imageUrl.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imageBuffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height
        });
      }

      // Move to start position after letterhead area
      doc.y = topMargin;

      // Report title
      doc.fontSize(16).font(fonts.bold)
        .text('YOKLAMA GEÇMİŞİ RAPORU', sideMargin, doc.y, { align: 'center' });
      doc.moveDown(0.5);

      // Generation date
      doc.fontSize(9).font(fonts.regular)
        .text(`Rapor Tarihi: ${formatDateTR(new Date())}`, { align: 'center' });
      doc.moveDown(1.5);

      // Student info box
      doc.fontSize(11).font(fonts.bold)
        .text('ÖĞRENCİ BİLGİLERİ', sideMargin);
      doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font(fonts.regular);
      doc.text(`Ad Soyad: ${student.firstName} ${student.lastName}`);
      if (student.phone) doc.text(`Telefon: ${student.phone}`);
      if (student.email) doc.text(`E-posta: ${student.email}`);
      doc.moveDown(1);

      // Summary section
      doc.fontSize(11).font(fonts.bold)
        .text('ÖZET İSTATİSTİKLER', sideMargin);
      doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
      doc.moveDown(0.5);

      const summaryY = doc.y;
      const colWidth = (doc.page.width - (sideMargin * 2)) / 3;

      // Draw summary boxes
      doc.fontSize(10).font(fonts.regular);

      // Attended
      doc.fillColor('green').text('Katıldı', sideMargin, summaryY);
      doc.fontSize(20).font(fonts.bold).text(summary.attended.toString(), sideMargin, summaryY + 15);

      // Absent
      doc.fillColor('red').fontSize(10).font(fonts.regular)
        .text('Katılmadı', sideMargin + colWidth, summaryY);
      doc.fontSize(20).font(fonts.bold).text(summary.absent.toString(), sideMargin + colWidth, summaryY + 15);

      // Rate
      doc.fillColor('blue').fontSize(10).font(fonts.regular)
        .text('Katılım Oranı', sideMargin + (colWidth * 2), summaryY);
      doc.fontSize(20).font(fonts.bold).text(`%${summary.rate}`, sideMargin + (colWidth * 2), summaryY + 15);

      doc.fillColor('black');
      doc.y = summaryY + 50;
      doc.moveDown(1);

      // Attendance records table
      doc.fontSize(11).font(fonts.bold)
        .text('YOKLAMA KAYITLARI', sideMargin);
      doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
      doc.moveDown(0.5);

      // Table header
      const tableLeft = sideMargin;
      const col1Width = 120; // Date
      const col2Width = 150; // Course
      const col3Width = 80;  // Time
      const col4Width = 80;  // Status
      const tableWidth = doc.page.width - (sideMargin * 2);

      let tableY = doc.y;
      doc.fontSize(9).font(fonts.bold);
      doc.text('Tarih', tableLeft, tableY);
      doc.text('Ders', tableLeft + col1Width, tableY);
      doc.text('Saat', tableLeft + col1Width + col2Width, tableY);
      doc.text('Durum', tableLeft + col1Width + col2Width + col3Width, tableY);

      doc.moveTo(tableLeft, tableY + 12).lineTo(tableLeft + tableWidth, tableY + 12).stroke();

      doc.font(fonts.regular);
      tableY += 18;

      // Group records by course
      const recordsByCourse = {};
      attendanceRecords.forEach((record) => {
        const courseName = record.scheduledLesson?.course?.name || 'Bilinmiyor';
        if (!recordsByCourse[courseName]) {
          recordsByCourse[courseName] = [];
        }
        recordsByCourse[courseName].push(record);
      });

      // Draw records
      Object.keys(recordsByCourse).forEach((courseName) => {
        const courseRecords = recordsByCourse[courseName];

        // Course header
        if (tableY > doc.page.height - bottomMargin - 50) {
          doc.addPage();
          tableY = topMargin;
          // Re-draw letterhead on new page
          if (letterhead?.imageUrl && letterhead.imageUrl.startsWith('data:image')) {
            const base64Data = letterhead.imageUrl.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            doc.image(imageBuffer, 0, 0, {
              width: doc.page.width,
              height: doc.page.height
            });
          }
        }

        doc.fontSize(9).font(fonts.bold).fillColor('blue')
          .text(`${courseName} (${courseRecords.length} ders)`, tableLeft, tableY);
        doc.fillColor('black');
        tableY += 15;

        courseRecords.forEach((record) => {
          if (tableY > doc.page.height - bottomMargin - 30) {
            doc.addPage();
            tableY = topMargin;
            // Re-draw letterhead on new page
            if (letterhead?.imageUrl && letterhead.imageUrl.startsWith('data:image')) {
              const base64Data = letterhead.imageUrl.split(',')[1];
              const imageBuffer = Buffer.from(base64Data, 'base64');
              doc.image(imageBuffer, 0, 0, {
                width: doc.page.width,
                height: doc.page.height
              });
            }
          }

          doc.font(fonts.regular);

          // Date - adjust for Turkey timezone
          let date = '-';
          if (record.scheduledLesson?.date) {
            const lessonDate = new Date(record.scheduledLesson.date);
            const adjusted = new Date(lessonDate.getTime() + TURKEY_OFFSET_MS);
            date = `${adjusted.getUTCDate()} ${['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'][adjusted.getUTCMonth()]} ${adjusted.getUTCFullYear().toString().slice(-2)}`;
          }
          doc.text(date, tableLeft, tableY);

          // Course (abbreviated if needed)
          const shortCourse = courseName.length > 20 ? courseName.substring(0, 18) + '...' : courseName;
          doc.text(shortCourse, tableLeft + col1Width, tableY);

          // Time
          const time = record.scheduledLesson?.startTime && record.scheduledLesson?.endTime
            ? `${record.scheduledLesson.startTime}-${record.scheduledLesson.endTime}`
            : '-';
          doc.text(time, tableLeft + col1Width + col2Width, tableY);

          // Status
          if (record.attended) {
            doc.fillColor('green').text('Katıldı', tableLeft + col1Width + col2Width + col3Width, tableY);
          } else {
            doc.fillColor('red').text('Katılmadı', tableLeft + col1Width + col2Width + col3Width, tableY);
          }
          doc.fillColor('black');

          tableY += 14;
        });

        tableY += 5; // Space between courses
      });

      doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke();

      // Footer - add page numbers
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        doc.fontSize(8).font(fonts.regular)
          .text(
            `${institution.name} - Sayfa ${i + 1}/${range.count}`,
            sideMargin,
            doc.page.height - bottomMargin + 10,
            { align: 'center', width: doc.page.width - (sideMargin * 2) }
          );
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePaymentPlanPDF,
  generateStudentStatusReportPDF,
  generateAttendanceHistoryPDF
};
