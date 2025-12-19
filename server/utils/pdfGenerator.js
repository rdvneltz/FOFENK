const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
      doc.fontSize(20).text(institution.name, { align: 'center' });
      doc.fontSize(10).text(institution.address || '', { align: 'center' });
      doc.text(`Tel: ${institution.phone || ''}`, { align: 'center' });
      doc.moveDown(2);

      // Başlık
      doc.fontSize(16).text('ÖDEME PLANI', { align: 'center', underline: true });
      doc.moveDown(2);

      // Öğrenci ve ders bilgileri
      doc.fontSize(12);
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
          doc.text(installment.installmentNumber.toString(), col1, currentY);
          doc.text(new Date(installment.dueDate).toLocaleDateString('tr-TR'), col2, currentY);
          doc.text(`${installment.amount.toFixed(2)} TL`, col3, currentY);
          doc.text(installment.isPaid ? 'Ödendi' : 'Bekliyor', col4, currentY);
          currentY += 20;
        });

        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + 500, currentY).stroke();
      }

      doc.moveDown(2);

      // Alt bilgi
      doc.fontSize(10).text(`Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' });

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
      doc.fontSize(16).font('Helvetica-Bold')
        .text('ÖĞRENCİ KAYIT DURUM RAPORU', sideMargin, doc.y, { align: 'center' });
      doc.moveDown(0.5);

      // Generation date
      doc.fontSize(9).font('Helvetica')
        .text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' });
      doc.moveDown(1.5);

      // Student info box
      doc.fontSize(11).font('Helvetica-Bold')
        .text('ÖĞRENCİ BİLGİLERİ', sideMargin);
      doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
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
          doc.fontSize(11).font('Helvetica-Bold')
            .text(`${planIndex + 1}. KURS: ${course?.name || 'Bilinmiyor'}`, sideMargin);
          doc.moveTo(sideMargin, doc.y + 2).lineTo(doc.page.width - sideMargin, doc.y + 2).stroke();
          doc.moveDown(0.5);

          doc.fontSize(10).font('Helvetica');
          if (enrollment) {
            doc.text(`Kayıt Tarihi: ${new Date(enrollment.startDate).toLocaleDateString('tr-TR')}`);
            const startMonth = new Date(enrollment.startDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
            const endMonth = enrollment.endDate
              ? new Date(enrollment.endDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
              : 'Devam Ediyor';
            doc.text(`Kayıt Dönemi: ${startMonth} - ${endMonth}`);
          }
          doc.moveDown(0.5);

          // Monthly breakdown table
          if (monthlyBreakdown && monthlyBreakdown.length > 0) {
            doc.fontSize(10).font('Helvetica-Bold').text('Aylık Katılım ve Ücret Detayı:');
            doc.moveDown(0.3);

            // Table headers
            const tableLeft = sideMargin;
            const col1Width = 120;
            const col2Width = 80;
            const col3Width = 100;
            const tableWidth = doc.page.width - (sideMargin * 2);

            doc.fontSize(9).font('Helvetica-Bold');
            let tableY = doc.y;
            doc.text('Ay', tableLeft, tableY);
            doc.text('Ders Sayısı', tableLeft + col1Width, tableY);
            doc.text('Tutar', tableLeft + col1Width + col2Width, tableY);
            doc.text('Açıklama', tableLeft + col1Width + col2Width + col3Width, tableY);

            doc.moveTo(tableLeft, tableY + 12).lineTo(tableLeft + tableWidth, tableY + 12).stroke();

            doc.font('Helvetica');
            tableY += 18;

            monthlyBreakdown.forEach((month) => {
              if (tableY > doc.page.height - bottomMargin - 50) {
                doc.addPage();
                tableY = topMargin;
              }

              doc.text(month.monthName, tableLeft, tableY);
              doc.text(month.lessonCount.toString(), tableLeft + col1Width, tableY);
              doc.text(`₺${month.amount.toLocaleString('tr-TR')}`, tableLeft + col1Width + col2Width, tableY);
              doc.text(month.note || '', tableLeft + col1Width + col2Width + col3Width, tableY, { width: 150 });
              tableY += 15;
            });

            doc.moveTo(tableLeft, tableY).lineTo(tableLeft + tableWidth, tableY).stroke();
            doc.y = tableY + 5;
          }

          doc.moveDown(0.5);

          // Total amount section
          doc.fontSize(10).font('Helvetica-Bold');
          const totalAmount = paymentPlan.totalAmount || 0;
          const discountedAmount = paymentPlan.discountedAmount || totalAmount;
          const hasDiscount = discountedAmount < totalAmount;

          if (hasDiscount) {
            doc.fillColor('gray').text(`Toplam Tutar: ₺${totalAmount.toLocaleString('tr-TR')}`, {
              continued: false,
              strike: true
            });
            const discountPercent = Math.round((1 - discountedAmount / totalAmount) * 100);
            doc.fillColor('green').text(`%${discountPercent} İndirimli Tutar: ₺${discountedAmount.toLocaleString('tr-TR')}`);
            doc.fillColor('black');
          } else {
            doc.text(`Toplam Tutar: ₺${totalAmount.toLocaleString('tr-TR')}`);
          }

          // Per lesson calculation
          if (paymentPlan.totalLessons && paymentPlan.totalLessons > 0) {
            const perLesson = discountedAmount / paymentPlan.totalLessons;
            doc.fontSize(9).font('Helvetica')
              .text(`(${paymentPlan.totalLessons} ders, ders başı ₺${perLesson.toFixed(0).toLocaleString('tr-TR')})`);
          }

          doc.moveDown(1);

          // Payment plan installments
          if (paymentPlan.installments && paymentPlan.installments.length > 0) {
            doc.fontSize(10).font('Helvetica-Bold').text('Ödeme Planı:');
            doc.moveDown(0.3);

            const instTableLeft = sideMargin;
            let instY = doc.y;

            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Taksit', instTableLeft, instY);
            doc.text('Vade Tarihi', instTableLeft + 60, instY);
            doc.text('Tutar', instTableLeft + 160, instY);
            doc.text('Durum', instTableLeft + 260, instY);
            doc.text('Ödeme Tarihi', instTableLeft + 340, instY);

            doc.moveTo(instTableLeft, instY + 12).lineTo(doc.page.width - sideMargin, instY + 12).stroke();

            doc.font('Helvetica');
            instY += 18;

            paymentPlan.installments.forEach((inst, idx) => {
              if (instY > doc.page.height - bottomMargin - 30) {
                doc.addPage();
                instY = topMargin;
              }

              const isPaid = inst.isPaid;
              doc.text(`${idx + 1}. Taksit`, instTableLeft, instY);
              doc.text(new Date(inst.dueDate).toLocaleDateString('tr-TR'), instTableLeft + 60, instY);

              if (isPaid) {
                doc.fillColor('gray').text(`₺${inst.amount.toLocaleString('tr-TR')}`, instTableLeft + 160, instY, { strike: true });
                doc.fillColor('green').text('ÖDENDİ', instTableLeft + 260, instY);
                doc.fillColor('black');
                if (inst.paidDate) {
                  doc.text(new Date(inst.paidDate).toLocaleDateString('tr-TR'), instTableLeft + 340, instY);
                }
              } else {
                doc.text(`₺${inst.amount.toLocaleString('tr-TR')}`, instTableLeft + 160, instY);
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

          // Remaining balance
          const paidAmount = paymentPlan.paidAmount || 0;
          const remainingAmount = discountedAmount - paidAmount;
          if (remainingAmount > 0) {
            doc.fontSize(10).font('Helvetica-Bold')
              .fillColor('red')
              .text(`Kalan Borç: ₺${remainingAmount.toLocaleString('tr-TR')}`);
            doc.fillColor('black');
          } else {
            doc.fontSize(10).font('Helvetica-Bold')
              .fillColor('green')
              .text('TÜM ÖDEMELER TAMAMLANMIŞTIR');
            doc.fillColor('black');
          }

          doc.moveDown(2);
        });
      } else {
        doc.text('Bu öğrenci için aktif ödeme planı bulunmamaktadır.');
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica')
          .text(
            `${institution.name} - Sayfa ${i + 1}/${pageCount}`,
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
  generateStudentStatusReportPDF
};
