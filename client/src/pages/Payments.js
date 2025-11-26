import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Search, FileDownload, Email } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { exportPayments } from '../utils/exportHelpers';
import EmailDialog from '../components/Email/EmailDialog';

const Payments = () => {
  const { institution, season } = useApp();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (institution && season) {
      loadPayments();
    }
  }, [institution, season]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments', {
        params: {
          institution: institution._id,
          season: season._id,
        },
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = payment.student?.firstName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      payment.student?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = filterMethod === 'all' || payment.paymentMethod === filterMethod;

    return matchesSearch && matchesMethod;
  });

  if (loading) {
    return <LoadingSpinner message="Ödemeler yükleniyor..." />;
  }

  if (!institution || !season) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum ve sezon seçin
        </Typography>
      </Box>
    );
  }

  const handleExportToExcel = async () => {
    try {
      await exportPayments({
        institutionId: institution._id,
        seasonId: season._id,
      });
    } catch (error) {
      console.error('Error exporting payments:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  const handleSendPaymentPlanEmail = (student) => {
    if (!student.email) {
      alert('Öğrencinin email adresi yok');
      return;
    }

    setSelectedStudent(student);
    setEmailDialogOpen(true);
  };

  const handleEmailSuccess = () => {
    alert('Email başarıyla gönderildi!');
    setSelectedStudent(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Ödemeler</Typography>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={handleExportToExcel}
        >
          Excel'e Aktar
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Öğrenci ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Ödeme Yöntemi</InputLabel>
              <Select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                label="Ödeme Yöntemi"
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="cash">Nakit</MenuItem>
                <MenuItem value="creditCard">Kredi Kartı</MenuItem>
                <MenuItem value="bankTransfer">Havale/EFT</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tarih</TableCell>
              <TableCell>Öğrenci</TableCell>
              <TableCell>Tutar</TableCell>
              <TableCell>Yöntem</TableCell>
              <TableCell>Kasa</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    {searchTerm || filterMethod !== 'all'
                      ? 'Ödeme bulunamadı'
                      : 'Henüz ödeme kaydı yok'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>
                    {payment.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString('tr-TR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {payment.student?.firstName} {payment.student?.lastName}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      ₺{payment.amount.toLocaleString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod === 'cash'
                      ? 'Nakit'
                      : payment.paymentMethod === 'creditCard'
                      ? 'Kredi Kartı'
                      : 'Havale/EFT'}
                  </TableCell>
                  <TableCell>{payment.cashRegister?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        payment.isRefunded ? 'İade Edildi' :
                        payment.status === 'completed' ? 'Tamamlandı' :
                        payment.status === 'refunded' ? 'İade Edildi' :
                        payment.status === 'cancelled' ? 'İptal' :
                        'Bekliyor'
                      }
                      color={
                        payment.isRefunded ? 'error' :
                        payment.status === 'completed' ? 'success' :
                        payment.status === 'refunded' ? 'error' :
                        payment.status === 'cancelled' ? 'default' :
                        'warning'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {payment.student?.email && (
                      <Tooltip title="Ödeme planı gönder">
                        <IconButton
                          size="small"
                          onClick={() => handleSendPaymentPlanEmail(payment.student)}
                          color="info"
                        >
                          <Email />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedStudent && (
        <EmailDialog
          open={emailDialogOpen}
          onClose={() => {
            setEmailDialogOpen(false);
            setSelectedStudent(null);
          }}
          recipients={[
            {
              email: selectedStudent.email,
              name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
            },
          ]}
          onSuccess={handleEmailSuccess}
        />
      )}
    </Box>
  );
};

export default Payments;
