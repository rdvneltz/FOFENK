import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  Assessment,
  FileDownload,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { exportReport } from '../utils/exportHelpers';

const Reports = () => {
  const { institution, season } = useApp();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('financial');
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    if (institution && season) {
      loadReportData();
    }
  }, [institution, season, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports', {
        params: {
          institution: institution._id,
          season: season._id,
          type: reportType,
        },
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (format === 'excel') {
      try {
        await exportReport({
          institutionId: institution._id,
          seasonId: season._id,
        });
      } catch (error) {
        console.error('Error exporting report:', error);
        alert('Excel dosyası oluşturulurken bir hata oluştu.');
      }
    } else if (format === 'pdf') {
      console.log('PDF export not yet implemented');
      // PDF export functionality can be added here
    }
  };

  if (loading) {
    return <LoadingSpinner message="Rapor yükleniyor..." />;
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

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Raporlar
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Rapor Türü</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label="Rapor Türü"
              >
                <MenuItem value="financial">Finansal Rapor</MenuItem>
                <MenuItem value="student">Öğrenci Raporu</MenuItem>
                <MenuItem value="attendance">Yoklama Raporu</MenuItem>
                <MenuItem value="payment">Ödeme Raporu</MenuItem>
                <MenuItem value="expense">Gider Raporu</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<PictureAsPdf />}
                onClick={() => handleExport('pdf')}
              >
                PDF İndir
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('excel')}
              >
                Excel İndir
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Financial Report */}
      {reportType === 'financial' && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Toplam Gelir
                </Typography>
                <Typography variant="h4" color="success.main">
                  ₺{reportData?.totalIncome?.toLocaleString('tr-TR') || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Toplam Gider
                </Typography>
                <Typography variant="h4" color="error.main">
                  ₺{reportData?.totalExpense?.toLocaleString('tr-TR') || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Net Kar/Zarar
                </Typography>
                <Typography
                  variant="h4"
                  color={
                    (reportData?.totalIncome || 0) - (reportData?.totalExpense || 0) >= 0
                      ? 'success.main'
                      : 'error.main'
                  }
                >
                  ₺
                  {(
                    (reportData?.totalIncome || 0) - (reportData?.totalExpense || 0)
                  ).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Bekleyen Ödemeler
                </Typography>
                <Typography variant="h4" color="warning.main">
                  ₺{reportData?.pendingPayments?.toLocaleString('tr-TR') || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Detaylı Finansal Özet
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Kategori</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Nakit Ödemeler</TableCell>
                      <TableCell align="right">
                        ₺{reportData?.cashPayments?.toLocaleString('tr-TR') || 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Kredi Kartı Ödemeleri</TableCell>
                      <TableCell align="right">
                        ₺{reportData?.cardPayments?.toLocaleString('tr-TR') || 0}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Havale/EFT</TableCell>
                      <TableCell align="right">
                        ₺{reportData?.bankTransfers?.toLocaleString('tr-TR') || 0}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Student Report */}
      {reportType === 'student' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Öğrenci İstatistikleri
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Toplam Öğrenci
              </Typography>
              <Typography variant="h3">{reportData?.totalStudents || 0}</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Aktif Öğrenci
              </Typography>
              <Typography variant="h3" color="success.main">
                {reportData?.activeStudents || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Deneme Öğrenci
              </Typography>
              <Typography variant="h3" color="info.main">
                {reportData?.trialStudents || 0}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Other report types */}
      {reportType !== 'financial' && reportType !== 'student' && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Assessment sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Bu rapor türü için veri hazırlanıyor...
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Reports;
