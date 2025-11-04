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

module.exports = {
  generatePaymentPlanPDF
};
