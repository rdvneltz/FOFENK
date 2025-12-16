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

  useEffect(() => {
    if (institution && season) {
      loadAllReports();
    }
  }, [institution, season]);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      const params = {
        institutionId: institution._id,
        seasonId: season._id,
      };

      const [financial, student, attendance, collection] = await Promise.all([
        api.get('/reports/financial-comprehensive', { params }),
        api.get('/reports/student-comprehensive', { params }),
        api.get('/reports/attendance-comprehensive', { params }),
        api.get('/reports/collection-rate', { params }),
      ]);

      setFinancialData(financial.data);
      setStudentData(student.data);
      setAttendanceData(attendance.data);
      setCollectionData(collection.data);
    } catch (error) {
      console.error('Error loading reports:', error);
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

      {/* Tab 0: Financial Report */}
      {activeTab === 0 && financialData && (
        <Box>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="success.dark" noWrap>
                    Toplam Gelir
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="success.dark" fontWeight="bold">
                    {formatCurrency(financialData.totalIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'error.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="error.dark" noWrap>
                    Toplam Gider
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="error.dark" fontWeight="bold">
                    {formatCurrency(financialData.totalExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: financialData.netIncome >= 0 ? 'info.light' : 'warning.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color={financialData.netIncome >= 0 ? 'info.dark' : 'warning.dark'} noWrap>
                    Net Kar/Zarar
                  </Typography>
                  <Typography
                    variant={isMobile ? 'h6' : 'h4'}
                    color={financialData.netIncome >= 0 ? 'info.dark' : 'warning.dark'}
                    fontWeight="bold"
                  >
                    {formatCurrency(financialData.netIncome)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'grey.200' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    Kar Marjı
                  </Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} fontWeight="bold">
                    %{financialData.totalIncome > 0
                      ? ((financialData.netIncome / financialData.totalIncome) * 100).toFixed(1)
                      : 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts Row */}
          <Grid container spacing={2}>
            {/* Income vs Expense Trend */}
            <Grid item xs={12} lg={8}>
              <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Gelir & Gider Trendi (Son 12 Ay)
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
                            label: 'Gelir',
                            data: financialData.monthlyTrend.map(d => d.income),
                            borderColor: chartColors.success,
                            backgroundColor: 'rgba(46, 125, 50, 0.1)',
                            fill: true,
                            tension: 0.3
                          },
                          {
                            label: 'Gider',
                            data: financialData.monthlyTrend.map(d => d.expense),
                            borderColor: chartColors.error,
                            backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            fill: true,
                            tension: 0.3
                          },
                          {
                            label: 'Net',
                            data: financialData.monthlyTrend.map(d => d.net),
                            borderColor: chartColors.primary,
                            backgroundColor: 'transparent',
                            borderDash: [5, 5],
                            tension: 0.3
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
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
              <Card sx={{ bgcolor: 'success.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, px: { xs: 1.5, md: 2 } }}>
                  <Typography variant="body2" color="success.dark">Tahsil Edilen</Typography>
                  <Typography variant={isMobile ? 'h6' : 'h4'} color="success.dark" fontWeight="bold">
                    {formatCurrency(collectionData.totalCollected)}
                  </Typography>
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
                        plugins: {
                          legend: { position: 'top' },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
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
      {activeTab === 2 && studentData && (
        <Box>
          {/* Student Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'primary.light' }}>
                <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                  <Typography variant="body2" color="primary.dark">Toplam Öğrenci</Typography>
                  <Typography variant={isMobile ? 'h4' : 'h3'} color="primary.dark" fontWeight="bold">
                    {studentData.totalStudents}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {studentData.statusCounts?.map((status, idx) => (
              <Grid item xs={6} md={3} key={idx}>
                <Card>
                  <CardContent sx={{ py: { xs: 1.5, md: 2 }, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {getStatusLabel(status._id)}
                    </Typography>
                    <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
                      {status.count}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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
    </Box>
  );
};

export default Reports;
