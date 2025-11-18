import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Alert,
  Box,
  Divider,
} from '@mui/material';
import { CheckCircle, Info } from '@mui/icons-material';

/**
 * Dialog for completing a lesson
 * - Shows planned duration
 * - Asks for actual duration
 * - Calculates payment based on actual duration
 * - Allows manual payment adjustment
 */
const CompleteLessonDialog = ({ open, onClose, lesson, instructor, onComplete }) => {
  const [actualDuration, setActualDuration] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate planned duration when dialog opens
  useEffect(() => {
    if (open && lesson) {
      const planned = calculatePlannedDuration(lesson.startTime, lesson.endTime);
      setActualDuration(planned.toString());

      // Calculate default payment
      if (instructor) {
        const defaultPayment = calculatePayment(instructor, planned);
        setPaymentAmount(defaultPayment.toString());
      }
    }
  }, [open, lesson, instructor]);

  const calculatePlannedDuration = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
    return hours;
  };

  const calculatePayment = (instructor, hours) => {
    if (!instructor || !instructor.paymentType) return 0;

    switch (instructor.paymentType) {
      case 'hourly':
        return hours * (instructor.paymentAmount || 0);
      case 'perLesson':
        return instructor.paymentAmount || 0;
      default:
        return 0;
    }
  };

  const handleActualDurationChange = (e) => {
    const value = e.target.value;
    setActualDuration(value);
    setError('');

    // Recalculate payment when duration changes
    if (instructor && value) {
      const hours = parseFloat(value);
      if (!isNaN(hours) && hours > 0) {
        const newPayment = calculatePayment(instructor, hours);
        setPaymentAmount(newPayment.toString());
      }
    }
  };

  const handlePaymentChange = (e) => {
    setPaymentAmount(e.target.value);
    setError('');
  };

  const handleComplete = async () => {
    // Validation
    const duration = parseFloat(actualDuration);
    const payment = parseFloat(paymentAmount);

    if (!actualDuration || isNaN(duration) || duration <= 0) {
      setError('Lütfen geçerli bir ders süresi girin');
      return;
    }

    if (!paymentAmount || isNaN(payment) || payment < 0) {
      setError('Lütfen geçerli bir ödeme tutarı girin');
      return;
    }

    setLoading(true);
    try {
      await onComplete({
        actualDuration: duration,
        paymentAmount: payment
      });
      handleClose();
    } catch (error) {
      setError('Ders tamamlanırken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActualDuration('');
    setPaymentAmount('');
    setError('');
    onClose();
  };

  if (!lesson || !instructor) {
    return null;
  }

  const plannedDuration = calculatePlannedDuration(lesson.startTime, lesson.endTime);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          Dersi Tamamla
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
          Bu dersi tamamlandı olarak işaretlemeden önce gerçek ders süresini
          ve eğitmen ödemesini kontrol edin.
        </Alert>

        <Grid container spacing={3}>
          {/* Lesson Info */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Ders Bilgileri
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>{lesson.course?.name || 'Ders'}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(lesson.date).toLocaleDateString('tr-TR')} - {lesson.startTime} - {lesson.endTime}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Eğitmen: {instructor.firstName} {instructor.lastName}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Planned Duration */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Planlanan Süre
            </Typography>
            <Typography variant="h6" color="primary">
              {plannedDuration} saat
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({lesson.startTime} - {lesson.endTime})
            </Typography>
          </Grid>

          {/* Actual Duration Input */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              type="number"
              label="Gerçek Ders Süresi (Saat)"
              value={actualDuration}
              onChange={handleActualDurationChange}
              inputProps={{
                step: 0.5,
                min: 0.5,
                max: 24
              }}
              helperText="Ders gerçekte kaç saat sürdü?"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Payment Info */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Eğitmen Ödeme Bilgileri
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                Ödeme Tipi: <strong>{getPaymentTypeLabel(instructor.paymentType)}</strong>
              </Typography>
              {instructor.paymentType === 'hourly' && (
                <Typography variant="body2">
                  Saatlik Ücret: <strong>₺{instructor.paymentAmount?.toLocaleString('tr-TR') || 0}</strong>
                </Typography>
              )}
              {instructor.paymentType === 'perLesson' && (
                <Typography variant="body2">
                  Ders Başı Ücret: <strong>₺{instructor.paymentAmount?.toLocaleString('tr-TR') || 0}</strong>
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Payment Amount Input */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              type="number"
              label="Eğitmen Ödemesi (₺)"
              value={paymentAmount}
              onChange={handlePaymentChange}
              inputProps={{
                step: 0.01,
                min: 0
              }}
              helperText={
                instructor.paymentType === 'hourly'
                  ? `Otomatik hesaplanan: ${actualDuration || plannedDuration} saat × ₺${instructor.paymentAmount || 0} = ₺${parseFloat(actualDuration || plannedDuration) * (instructor.paymentAmount || 0)}`
                  : 'İstediğiniz tutarı girebilirsiniz'
              }
            />
          </Grid>

          <Grid item xs={12}>
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Bu tutar eğitmenin bakiyesine eklenecek ve gider kaydı oluşturulacaktır.
                Emin misiniz?
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleComplete}
          variant="contained"
          color="success"
          disabled={loading}
          startIcon={<CheckCircle />}
        >
          {loading ? 'Tamamlanıyor...' : 'Dersi Tamamla'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const getPaymentTypeLabel = (type) => {
  switch (type) {
    case 'perLesson':
      return 'Ders Başı';
    case 'hourly':
      return 'Saat Başı';
    case 'perStudent':
      return 'Öğrenci Başı';
    case 'monthly':
      return 'Aylık';
    default:
      return type;
  }
};

export default CompleteLessonDialog;
