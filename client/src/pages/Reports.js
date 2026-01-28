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
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Collapse,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import {
  PictureAsPdf,
  Download,
  Assessment,
  TrendingUp,
  TrendingDown,
  People,
  School,
  AttachMoney,
  Receipt,
  EventAvailable,
  ExpandMore,
  ExpandLess,
  Refresh,
  Close,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { exportReport } from '../utils/exportHelpers';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Reports = () => {
  const { institution, season } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});

  // Report Data States
  const [financialData, setFinancialData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [collectionData, setCollectionData] = useState(null);

  // Collection Details Dialog
  const [collectionDialog, setCollectionDialog] = useState({
    open: false,
    loading: false,
    data: null
  });

  // Chart bar click detail dialog
  const [chartDetailDialog, setChartDetailDialog] = useState({
    open: false,
    loading: false,
    data: null,
    period: '',
    type: '' // 'expected' or 'collected'
  });

  const loadChartDetail = async (period, type) => {
    setChartDetailDialog({ open: true, loading: true, data: null, period, type });
    try {
      const response = await api.get('/reports/installments-by-month', {
        params: { institutionId: institution._id, seasonId: season._id, period }
      });
      setChartDetailDialog(prev => ({ ...prev, loading: false, data: response.data }));
    } catch (error) {
      console.error('Error loading chart detail:', error);
      setChartDetailDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Financial month detail dialog (for clickable chart)
  const [financialDetailDialog, setFinancialDetailDialog] = useState({
    open: false,
    loading: false,
    data: null,
    period: '',
    type: '' // 'income' or 'expense'
  });

  const loadFinancialDetail = async (period, type) => {
    setFinancialDetailDialog({ open: true, loading: true, data: null, period, type });
    try {
      const response = await api.get('/reports/financial-month-detail', {
        params: { institutionId: institution._id, seasonId: season._id, period, type }
      });
      setFinancialDetailDialog(prev => ({ ...prev, loading: false, data: response.data }));
    } catch (error) {
      console.error('Error loading financial detail:', error);
      setFinancialDetailDialog(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (institution && season) {
      loadAllReports();
    }
  }, [institution, season]);

  // Error state
  const [error, setError] = useState(null);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        institutionId: institution._id,
        seasonId: season._id,
      };

      // Load each report separately to handle individual errors
      try {
        const financial = await api.get('/reports/financial-comprehensive', { params });
        setFinancialData(financial.data);
      } catch (err) {
        console.error('Error loading financial report:', err);
        setFinancialData(null);
      }

      try {
        const student = await api.get('/reports/student-comprehensive', { params });
        setStudentData(student.data);
      } catch (err) {
        console.error('Error loading student report:', err);
        setStudentData(null);
      }

      try {
        const attendance = await api.get('/reports/attendance-comprehensive', { params });
        setAttendanceData(attendance.data);
      } catch (err) {
        console.error('Error loading attendance report:', err);
        setAttendanceData(null);
      }

      try {
        const collection = await api.get('/reports/collection-rate', { params });
        setCollectionData(collection.data);
      } catch (err) {
        console.error('Error loading collection report:', err);
        setCollectionData(null);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Raporlar yüklenirken bir hata oluştu');
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
    }
  };

  // Load collection details
  const loadCollectionDetails = async () => {
    setCollectionDialog(prev => ({ ...prev, open: true, loading: true }));
    try {
      const response = await api.get('/reports/collection-details', {
        params: { institutionId: institution._id, seasonId: season._id }
      });
      setCollectionDialog({ open: true, loading: false, data: response.data });
    } catch (error) {
      console.error('Error loading collection details:', error);
      setCollectionDialog({ open: true, loading: false, data: null });
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatCurrency = (value) => {
    return `₺${(value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Nakit',
      creditCard: 'Kredi Kartı',
      bankTransfer: 'Havale/EFT',
      check: 'Çek',
      other: 'Diğer'
    };
    return labels[method] || method || 'Diğer';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Aktif',
      inactive: 'Pasif',
      trial: 'Deneme',
      archived: 'Arşiv'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <LoadingSpinner message="Raporlar yükleniyor..." />;
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

  // Chart Colors
  const chartColors = {
    primary: 'rgba(25, 118, 210, 0.8)',
    success: 'rgba(46, 125, 50, 0.8)',
    error: 'rgba(211, 47, 47, 0.8)',
    warning: 'rgba(237, 108, 2, 0.8)',
    info: 'rgba(2, 136, 209, 0.8)',
    purple: 'rgba(156, 39, 176, 0.8)',
  };

  const pieColors = [
    'rgba(25, 118, 210, 0.8)',
    'rgba(46, 125, 50, 0.8)',
    'rgba(237, 108, 2, 0.8)',
    'rgba(156, 39, 176, 0.8)',
    'rgba(0, 151, 167, 0.8)',
    'rgba(255, 152, 0, 0.8)',
    'rgba(233, 30, 99, 0.8)',
    'rgba(63, 81, 181, 0.8)',
  ];

  return (
    <Box sx={{ pb: { xs: 8, md: 2 } }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
        mb: 3
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'}>
          Raporlar
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size={isMobile ? 'small' : 'medium'}
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAllReports}
          >
            Yenile
          </Button>
          <Button
            size={isMobile ? 'small' : 'medium'}
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('excel')}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<AttachMoney />} label={isMobile ? '' : 'Finansal'} iconPosition="start" />
          <Tab icon={<Receipt />} label={isMobile ? '' : 'Tahsilat'} iconPosition="start" />
          <Tab icon={<People />} label={isMobile ? '' : 'Öğrenci'} iconPosition="start" />
          <Tab icon={<EventAvailable />} label={isMobile ? '' : 'Yoklama'} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {/* Tab 0: Financial Report */}
      {activeTab === 0 && !financialData && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Finansal rapor verisi yüklenemedi. Lütfen sayfayı yenileyin.
          </Typography>
        </Paper>
      )}
      {activeTab === 0 && financialData && (
        <Box>
          {/* Summary Cards - 2 rows: Income then Expenses */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Income Row */}
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="success.dark" noWrap>
                    Tahsil Edilen Gelir
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="success.dark" fontWeight="bold">
                    {formatCurrency(financialData.realizedIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="warning.dark" noWrap>
                    Bekleyen Gelir
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="warning.dark" fontWeight="bold">
                    {formatCurrency(financialData.pendingIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {/* Expense Row */}
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="error.dark" noWrap>
                    Ödenen Gider
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="error.dark" fontWeight="bold">
                    {formatCurrency(financialData.paidExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'grey.200' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Bekleyen Gider
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} fontWeight="bold">
                    {formatCurrency(financialData.pendingExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Net Summary Row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={4}>
              <Card sx={{ bgcolor: financialData.netIncome >= 0 ? 'info.light' : 'error.light' }}>
                <CardContent sx={{ py: { xs: 1, md: 1.5 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color={financialData.netIncome >= 0 ? 'info.dark' : 'error.dark'} noWrap>
                    Net Kar/Zarar (Gerçekleşen)
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h5'} color={financialData.netIncome >= 0 ? 'info.dark' : 'error.dark'} fontWeight="bold">
                    {formatCurrency(financialData.netIncome)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tahsil edilen gelir - Ödenen gider
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={4}>
              <Card sx={{ bgcolor: 'grey.100' }}>
                <CardContent sx={{ py: { xs: 1, md: 1.5 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Kar Marjı
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">
                    %{financialData.realizedIncome > 0
                      ? ((financialData.netIncome / financialData.realizedIncome) * 100).toFixed(1)
                      : 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent sx={{ py: { xs: 1, md: 1.5 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="primary.dark" noWrap>
                    Toplam (Gerçekleşen + Bekleyen)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="primary.dark">Gelir</Typography>
                      <Typography variant="body1" color="primary.dark" fontWeight="bold">
                        {formatCurrency(financialData.totalIncome)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="primary.dark">Gider</Typography>
                      <Typography variant="body1" color="primary.dark" fontWeight="bold">
                        {formatCurrency(financialData.totalExpenses)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row */}
          <Grid container spacing={2}>
            {/* Income vs Expense Trend - Clickable */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Gelir & Gider Trendi (Son 12 Ay)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Noktalara tıklayarak aylık detay görüntüleyebilirsiniz
                </Typography>
                {financialData.monthlyTrend?.length > 0 && (
                  <Box sx={{ height: { xs: 250, md: 300 } }}>
                    <Line
                      data={{
                        labels: financialData.monthlyTrend.map(d => {
                          const [year, month] = d.period.split('-');
                          return `${month}/${year.slice(2)}`;
                        }),
                        datasets: [
                          {
                            label: 'Gelir (Tahsil Edilen)',
                            data: financialData.monthlyTrend.map(d => d.income),
                            borderColor: chartColors.success,
                            backgroundColor: 'rgba(46, 125, 50, 0.1)',
                            fill: true,
                            tension: 0.3,
                            pointRadius: 5,
                            pointHoverRadius: 8,
                            pointBackgroundColor: chartColors.success
                          },
                          {
                            label: 'Gider (Ödenen)',
                            data: financialData.monthlyTrend.map(d => d.expense),
                            borderColor: chartColors.error,
                            backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            fill: true,
                            tension: 0.3,
                            pointRadius: 5,
                            pointHoverRadius: 8,
                            pointBackgroundColor: chartColors.error
                          },
                          {
                            label: 'Bekleyen Gider',
                            data: financialData.monthlyTrend.map(d => d.pendingExpense || 0),
                            borderColor: 'rgba(237, 108, 2, 0.6)',
                            backgroundColor: 'transparent',
                            borderDash: [4, 4],
                            tension: 0.3,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            pointBackgroundColor: chartColors.warning
                          },
                          {
                            label: 'Net',
                            data: financialData.monthlyTrend.map(d => d.net),
                            borderColor: chartColors.primary,
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            tension: 0.3,
                            pointRadius: 4,
                            pointHoverRadius: 7
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const idx = elements[0].index;
                            const datasetIdx = elements[0].datasetIndex;
                            const period = financialData.monthlyTrend[idx].period;
                            // 0 = income, 1 = paid expense, 2 = pending expense, 3 = net
                            const type = datasetIdx === 0 ? 'income' : 'expense';
                            loadFinancialDetail(period, type);
                          }
                        },
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)} (detay icin tıkla)`
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (v) => formatCurrency(v),
                              maxTicksLimit: 6
                            }
                          }
                        },
                        onHover: (event, chartElement) => {
                          event.native.target.style.cursor = chartElement.length > 0 ? 'pointer' : 'default';
                        }
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Payment Methods Pie */}
            <Grid item xs={12} sm={6} lg={4}>
              <Paper sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  Ödeme Yöntemleri
                </Typography>
                {financialData.paymentsByMethod?.length > 0 ? (
                  <Box sx={{ height: { xs: 200, md: 250 } }}>
                    <Pie
                      data={{
                        labels: financialData.paymentsByMethod.map(d => getPaymentMethodLabel(d._id)),
                        datasets: [{
                          data: financialData.paymentsByMethod.map(d => d.total),
                          backgroundColor: pieColors
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    Veri bulunamadı
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Expense Categories */}
            <Grid item xs={12} sm={6} lg={4}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Gider Kategorileri
                </Typography>
                {financialData.expensesByCategory?.length > 0 ? (
                  <Box sx={{ height: { xs: 200, md: 250 } }}>
                    <Doughnut
                      data={{
                        labels: financialData.expensesByCategory.map(d => d._id || 'Diğer'),
                        datasets: [{
                          data: financialData.expensesByCategory.map(d => d.total),
                          backgroundColor: pieColors
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}`
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    Veri bulunamadı
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Details Tables */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleSection('paymentDetails')}
                >
                  <Typography variant="h6">Ödeme Detayları</Typography>
                  <IconButton size="small">
                    {expandedSections.paymentDetails ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
                <Collapse in={expandedSections.paymentDetails !== false}>
                  <TableContainer sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Yöntem</TableCell>
                          <TableCell align="right">İşlem</TableCell>
                          <TableCell align="right">Tutar</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {financialData.paymentsByMethod?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{getPaymentMethodLabel(item._id)}</TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell><strong>Toplam</strong></TableCell>
                          <TableCell align="right">
                            <strong>{financialData.paymentsByMethod?.reduce((s, i) => s + i.count, 0)}</strong>
                          </TableCell>
                          <TableCell align="right">
                            <strong>{formatCurrency(financialData.totalIncome)}</strong>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Collapse>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 1: Collection Rate Report */}
      {activeTab === 1 && !collectionData && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Tahsilat raporu verisi yüklenemedi. Lütfen sayfayı yenileyin.
          </Typography>
        </Paper>
      )}
      {activeTab === 1 && collectionData && (
        <Box>
          {/* Collection Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Tahsilat Oranı</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h3'} color="primary.main" fontWeight="bold">
                    %{collectionData.collectionRate}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={collectionData.collectionRate}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    color={collectionData.collectionRate >= 80 ? 'success' : collectionData.collectionRate >= 50 ? 'warning' : 'error'}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card
                sx={{
                  bgcolor: 'success.light',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'success.200', transform: 'scale(1.02)' },
                  transition: 'all 0.2s'
                }}
                onClick={loadCollectionDetails}
              >
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="success.dark">Tahsil Edilen</Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="success.dark" fontWeight="bold">
                    {formatCurrency(collectionData.totalCollected)}
                  </Typography>
                  <Typography variant="caption" color="success.dark">Detay için tıklayın</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="warning.dark">Bekleyen</Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="warning.dark" fontWeight="bold">
                    {formatCurrency(collectionData.pendingAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="error.dark">Gecikmiş</Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="error.dark" fontWeight="bold">
                    {formatCurrency(collectionData.overdueAmount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Collection Chart */}
          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Aylık Tahsilat Performansı
                </Typography>
                {collectionData.chartData?.length > 0 && (
                  <Box sx={{ height: { xs: 250, md: 300 } }}>
                    <Bar
                      data={{
                        labels: collectionData.chartData.map(d => {
                          const [year, month] = d.period.split('-');
                          return `${month}/${year.slice(2)}`;
                        }),
                        datasets: [
                          {
                            label: 'Beklenen',
                            data: collectionData.chartData.map(d => d.expected),
                            backgroundColor: 'rgba(25, 118, 210, 0.3)',
                            borderColor: 'rgba(25, 118, 210, 1)',
                            borderWidth: 1
                          },
                          {
                            label: 'Tahsil Edilen',
                            data: collectionData.chartData.map(d => d.collected),
                            backgroundColor: 'rgba(46, 125, 50, 0.8)',
                            borderColor: 'rgba(46, 125, 50, 1)',
                            borderWidth: 1
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (event, elements) => {
                          if (elements.length > 0) {
                            const idx = elements[0].index;
                            const datasetIdx = elements[0].datasetIndex;
                            const period = collectionData.chartData[idx].period;
                            const type = datasetIdx === 0 ? 'expected' : 'collected';
                            loadChartDetail(period, type);
                          }
                        },
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)} (tıkla detay için)`
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (v) => formatCurrency(v),
                              maxTicksLimit: 6
                            }
                          }
                        },
                        onHover: (event, chartElement) => {
                          event.native.target.style.cursor = chartElement.length > 0 ? 'pointer' : 'default';
                        }
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Collection Rate by Month */}
            <Grid item xs={12} lg={4}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Aylık Tahsilat Oranları
                </Typography>
                {collectionData.chartData?.length > 0 && (
                  <Box sx={{ height: { xs: 250, md: 300 } }}>
                    <Line
                      data={{
                        labels: collectionData.chartData.map(d => {
                          const [year, month] = d.period.split('-');
                          return `${month}/${year.slice(2)}`;
                        }),
                        datasets: [{
                          label: 'Tahsilat Oranı (%)',
                          data: collectionData.chartData.map(d => parseFloat(d.rate)),
                          borderColor: chartColors.primary,
                          backgroundColor: 'rgba(25, 118, 210, 0.1)',
                          fill: true,
                          tension: 0.3
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `Tahsilat: %${ctx.parsed.y}`
                            }
                          }
                        },
                        scales: {
                          y: {
                            min: 0,
                            max: 100,
                            ticks: {
                              callback: (v) => `%${v}`
                            }
                          }
                        }
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 2: Student Report */}
      {activeTab === 2 && !studentData && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Öğrenci raporu verisi yüklenemedi. Lütfen sayfayı yenileyin.
          </Typography>
        </Paper>
      )}
      {activeTab === 2 && studentData && (
        <Box>
          {/* Student Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="success.dark">Aktif</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="success.dark" fontWeight="bold">
                    {studentData.activeCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="info.dark">Deneme</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="info.dark" fontWeight="bold">
                    {studentData.trialCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="warning.dark">Pasif</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.dark" fontWeight="bold">
                    {studentData.inactiveCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'grey.300' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Arşiv</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
                    {studentData.archivedCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="primary.dark">Toplam (Aktif+Deneme)</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="primary.dark" fontWeight="bold">
                    {studentData.totalStudents || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={2}>
            {/* Registration Trend */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Kayıt Trendi (Son 12 Ay)
                </Typography>
                {studentData.registrationData?.length > 0 && (
                  <Box sx={{ height: { xs: 250, md: 300 } }}>
                    <Bar
                      data={{
                        labels: studentData.registrationData.map(d => {
                          const [year, month] = d.period.split('-');
                          return `${month}/${year.slice(2)}`;
                        }),
                        datasets: [{
                          label: 'Yeni Kayıt',
                          data: studentData.registrationData.map(d => d.count),
                          backgroundColor: chartColors.primary,
                          borderRadius: 4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                          }
                        }
                      }}
                    />
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Course Enrollment Distribution */}
            <Grid item xs={12} sm={6} lg={4}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Kurs Dağılımı
                </Typography>
                {studentData.enrollmentStats?.length > 0 ? (
                  <Box sx={{ height: { xs: 200, md: 250 } }}>
                    <Doughnut
                      data={{
                        labels: studentData.enrollmentStats.map(d => d.courseName),
                        datasets: [{
                          data: studentData.enrollmentStats.map(d => d.totalEnrollments),
                          backgroundColor: pieColors
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    Veri bulunamadı
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Enrollment Table */}
            <Grid item xs={12} sm={6} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Kurs Bazlı Kayıtlar
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Kurs</TableCell>
                        <TableCell align="center">Toplam</TableCell>
                        <TableCell align="center">Aktif</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentData.enrollmentStats?.map((course, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{course.courseName}</TableCell>
                          <TableCell align="center">{course.totalEnrollments}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={course.activeEnrollments}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 3: Attendance Report */}
      {activeTab === 3 && !attendanceData && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Yoklama raporu verisi yüklenemedi veya henüz yoklama kaydı yok.
          </Typography>
        </Paper>
      )}
      {activeTab === 3 && attendanceData && (
        <Box>
          {/* Attendance Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent sx={{ py: { xs: 1, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="success.dark">Katıldı</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="success.dark" fontWeight="bold">
                    {attendanceData.stats?.present || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent sx={{ py: { xs: 1, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="error.dark">Gelmedi</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="error.dark" fontWeight="bold">
                    {attendanceData.stats?.absent || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'warning.light' }}>
                <CardContent sx={{ py: { xs: 1, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="warning.dark">Geç Geldi</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="warning.dark" fontWeight="bold">
                    {attendanceData.stats?.late || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={2.4}>
              <Card sx={{ bgcolor: 'info.light' }}>
                <CardContent sx={{ py: { xs: 1, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="info.dark">İzinli</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="info.dark" fontWeight="bold">
                    {attendanceData.stats?.excused || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card>
                <CardContent sx={{ py: { xs: 1, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Katılım Oranı</Typography>
                  <Typography variant={isMobile ? 'h5' : 'h4'} color="primary.main" fontWeight="bold">
                    %{attendanceData.stats?.attendanceRate || 0}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={parseFloat(attendanceData.stats?.attendanceRate) || 0}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    color={parseFloat(attendanceData.stats?.attendanceRate) >= 80 ? 'success' : 'warning'}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={2}>
            {/* Attendance Distribution */}
            <Grid item xs={12} sm={6} lg={4}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Yoklama Dağılımı
                </Typography>
                {attendanceData.stats?.total > 0 ? (
                  <Box sx={{ height: { xs: 200, md: 250 } }}>
                    <Pie
                      data={{
                        labels: ['Katıldı', 'Gelmedi', 'Geç', 'İzinli'],
                        datasets: [{
                          data: [
                            attendanceData.stats.present,
                            attendanceData.stats.absent,
                            attendanceData.stats.late,
                            attendanceData.stats.excused
                          ],
                          backgroundColor: [
                            chartColors.success,
                            chartColors.error,
                            chartColors.warning,
                            chartColors.info
                          ]
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'bottom', labels: { boxWidth: 12 } }
                        }
                      }}
                    />
                  </Box>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    Yoklama verisi bulunamadı
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Attendance by Course */}
            <Grid item xs={12} sm={6} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Kurs Bazlı Yoklama
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Kurs</TableCell>
                        <TableCell align="center">Katıldı</TableCell>
                        <TableCell align="center">Gelmedi</TableCell>
                        <TableCell align="center">Geç</TableCell>
                        <TableCell align="center">Oran</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.byCourse?.map((course, idx) => {
                        const rate = course.total > 0
                          ? (((course.present + course.late) / course.total) * 100).toFixed(0)
                          : 0;
                        return (
                          <TableRow key={idx}>
                            <TableCell>{course.courseName}</TableCell>
                            <TableCell align="center">
                              <Chip label={course.present} size="small" color="success" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={course.absent} size="small" color="error" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={course.late} size="small" color="warning" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`%${rate}`}
                                size="small"
                                color={rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Financial Month Detail Dialog */}
      <Dialog
        open={financialDetailDialog.open}
        onClose={() => setFinancialDetailDialog({ open: false, loading: false, data: null, period: '', type: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {(() => {
                if (!financialDetailDialog.period) return '';
                const [y, m] = financialDetailDialog.period.split('-');
                const monthNames = ['', 'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
                return `${monthNames[parseInt(m)]} ${y} - ${financialDetailDialog.type === 'income' ? 'Gelir Detayi' : 'Gider Detayi'}`;
              })()}
            </Typography>
            <IconButton onClick={() => setFinancialDetailDialog({ open: false, loading: false, data: null, period: '', type: '' })}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {financialDetailDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : financialDetailDialog.data ? (
            <Box>
              <Paper sx={{ p: 1.5, mb: 2, bgcolor: financialDetailDialog.type === 'income' ? 'success.50' : 'error.50' }}>
                <Typography variant="h6" color={financialDetailDialog.type === 'income' ? 'success.main' : 'error.main'}>
                  Toplam: {formatCurrency(financialDetailDialog.data.total)} ({financialDetailDialog.data.count} kayit)
                </Typography>
              </Paper>
              {financialDetailDialog.data.items?.length > 0 ? (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tarih</TableCell>
                        <TableCell>{financialDetailDialog.type === 'income' ? 'Ogrenci' : 'Aciklama'}</TableCell>
                        <TableCell>Kategori</TableCell>
                        {financialDetailDialog.type === 'income' && <TableCell>Kurs</TableCell>}
                        <TableCell>Kasa</TableCell>
                        {financialDetailDialog.type === 'expense' && <TableCell>Durum</TableCell>}
                        <TableCell align="right">Tutar</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {financialDetailDialog.data.items.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>{new Date(item.date).toLocaleDateString('tr-TR')}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>
                            <Chip size="small" label={financialDetailDialog.type === 'income' ? getPaymentMethodLabel(item.category) : (item.category || 'Diger')} variant="outlined" />
                          </TableCell>
                          {financialDetailDialog.type === 'income' && <TableCell>{item.course}</TableCell>}
                          <TableCell>{item.cashRegister}</TableCell>
                          {financialDetailDialog.type === 'expense' && (
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.status === 'paid' ? 'Odendi' : item.status === 'overdue' ? 'Gecikti' : 'Bekliyor'}
                                color={item.status === 'paid' ? 'success' : item.status === 'overdue' ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            </TableCell>
                          )}
                          <TableCell align="right">
                            <Typography fontWeight="bold" color={financialDetailDialog.type === 'income' ? 'success.main' : 'error.main'}>
                              {formatCurrency(item.amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={2}>Bu donemde kayit bulunamadi</Typography>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={2}>Veri yuklenemedi</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {financialDetailDialog.data && (
            <Button
              size="small"
              onClick={() => {
                const newType = financialDetailDialog.type === 'income' ? 'expense' : 'income';
                loadFinancialDetail(financialDetailDialog.period, newType);
              }}
            >
              {financialDetailDialog.type === 'income' ? 'Giderleri Goster' : 'Gelirleri Goster'}
            </Button>
          )}
          <Button onClick={() => setFinancialDetailDialog({ open: false, loading: false, data: null, period: '', type: '' })}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Chart Bar Detail Dialog */}
      <Dialog
        open={chartDetailDialog.open}
        onClose={() => setChartDetailDialog({ open: false, loading: false, data: null, period: '', type: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {(() => {
                if (!chartDetailDialog.period) return '';
                const [y, m] = chartDetailDialog.period.split('-');
                const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                return `${monthNames[parseInt(m)]} ${y} - ${chartDetailDialog.type === 'expected' ? 'Beklenen Taksitler' : 'Tahsil Edilen'}`;
              })()}
            </Typography>
            <IconButton onClick={() => setChartDetailDialog({ open: false, loading: false, data: null, period: '', type: '' })}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {chartDetailDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : chartDetailDialog.data ? (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center', bgcolor: 'primary.light' }}>
                  <Typography variant="caption" color="primary.dark">Beklenen</Typography>
                  <Typography variant="h6" color="primary.dark" fontWeight="bold">
                    {formatCurrency(chartDetailDialog.data.expectedTotal)} ({chartDetailDialog.data.expectedCount})
                  </Typography>
                </Paper>
                <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center', bgcolor: 'success.light' }}>
                  <Typography variant="caption" color="success.dark">Tahsil Edilen</Typography>
                  <Typography variant="h6" color="success.dark" fontWeight="bold">
                    {formatCurrency(chartDetailDialog.data.collectedTotal)} ({chartDetailDialog.data.collectedCount})
                  </Typography>
                </Paper>
              </Box>
              {(() => {
                const items = chartDetailDialog.type === 'expected'
                  ? chartDetailDialog.data.expected
                  : chartDetailDialog.data.collected;
                if (!items || items.length === 0) {
                  return <Typography color="text.secondary" textAlign="center" py={2}>Bu dönemde kayıt bulunamadı</Typography>;
                }
                return (
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Öğrenci</TableCell>
                          <TableCell>Kurs</TableCell>
                          <TableCell>Taksit No</TableCell>
                          <TableCell>Vade</TableCell>
                          <TableCell align="right">Tutar</TableCell>
                          <TableCell align="right">Ödenen</TableCell>
                          <TableCell>Durum</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>{item.student}</TableCell>
                            <TableCell>{item.course}</TableCell>
                            <TableCell>{item.installmentNumber}. taksit</TableCell>
                            <TableCell>{new Date(item.dueDate).toLocaleDateString('tr-TR')}</TableCell>
                            <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                            <TableCell align="right">
                              <Typography color={item.paidAmount > 0 ? 'success.main' : 'text.secondary'} fontWeight={item.paidAmount > 0 ? 'bold' : 'normal'}>
                                {formatCurrency(item.paidAmount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.isPaid ? 'Ödendi' : item.paidAmount > 0 ? 'Kısmi' : 'Bekliyor'}
                                color={item.isPaid ? 'success' : item.paidAmount > 0 ? 'warning' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              })()}
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={2}>Veri yüklenemedi</Typography>
          )}
        </DialogContent>
        <DialogActions>
          {chartDetailDialog.data && chartDetailDialog.type === 'collected' && (
            <Button
              size="small"
              onClick={() => {
                setChartDetailDialog(prev => ({ ...prev, type: 'expected' }));
              }}
            >
              Beklenen Taksitleri Göster
            </Button>
          )}
          {chartDetailDialog.data && chartDetailDialog.type === 'expected' && (
            <Button
              size="small"
              onClick={() => {
                setChartDetailDialog(prev => ({ ...prev, type: 'collected' }));
              }}
            >
              Tahsil Edilenleri Göster
            </Button>
          )}
          <Button onClick={() => setChartDetailDialog({ open: false, loading: false, data: null, period: '', type: '' })}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Collection Details Dialog */}
      <Dialog
        open={collectionDialog.open}
        onClose={() => setCollectionDialog({ open: false, loading: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp color="success" />
            Tahsilat Detayları
          </Box>
        </DialogTitle>
        <DialogContent>
          {collectionDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : collectionDialog.data ? (
            <Box>
              {/* Summary */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                <Typography variant="h6" color="success.main">
                  Toplam: {formatCurrency(collectionDialog.data.totalAmount)} ({collectionDialog.data.totalPayments} ödeme)
                </Typography>
              </Box>

              {/* Monthly Details */}
              {collectionDialog.data.monthlyDetails?.length > 0 ? (
                collectionDialog.data.monthlyDetails.map((month, idx) => (
                  <Accordion key={idx} defaultExpanded={idx === 0}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                        <Typography fontWeight="bold">
                          {new Date(month.period + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                        </Typography>
                        <Typography color="success.main" fontWeight="bold">
                          {formatCurrency(month.total)} ({month.count} ödeme)
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Tarih</TableCell>
                              <TableCell>Öğrenci</TableCell>
                              <TableCell>Kurs</TableCell>
                              <TableCell>Kasa</TableCell>
                              <TableCell>Ödeme Tipi</TableCell>
                              <TableCell align="right">Tutar</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {month.payments.map((payment, pIdx) => (
                              <TableRow key={pIdx}>
                                <TableCell>
                                  {new Date(payment.date).toLocaleDateString('tr-TR')}
                                </TableCell>
                                <TableCell>{payment.studentName}</TableCell>
                                <TableCell>{payment.courseName}</TableCell>
                                <TableCell>{payment.cashRegister || '-'}</TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={payment.paymentType === 'creditCard' ? 'Kredi Kartı' : 'Nakit'}
                                    color={payment.paymentType === 'creditCard' ? 'info' : 'success'}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography color="success.main" fontWeight="bold">
                                    {formatCurrency(payment.amount)}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))
              ) : (
                <Typography color="text.secondary" textAlign="center" py={2}>
                  Henüz tahsilat kaydı yok
                </Typography>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={2}>
              Veri yüklenemedi
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollectionDialog({ open: false, loading: false, data: null })}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Reports;
