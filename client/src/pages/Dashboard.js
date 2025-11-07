import React, { useState, useEffect } from 'react';
import { Grid, Typography, Paper, Box } from '@mui/material';
import {
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as IncomeIcon,
  TrendingDown as ExpenseIcon,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import StatCard from '../components/Dashboard/StatCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import api from '../api';
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
  Legend
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
  Legend
);

const Dashboard = () => {
  const { institution, season } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    cashRegisters: [],
    totalCashRegisterBalance: 0,
    activeEnrollments: 0,
    totalCourses: 0,
    totalInstructors: 0,
  });
  const [incomeExpenseData, setIncomeExpenseData] = useState([]);
  const [studentGrowthData, setStudentGrowthData] = useState([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState([]);
  const [expenseCategoriesData, setExpenseCategoriesData] = useState([]);
  const [expectedPayments, setExpectedPayments] = useState({
    today: [],
    thisWeek: [],
    thisMonth: [],
    nextMonth: [],
    overdue: [],
    pendingCreditCard: [] // Pending credit card payments
  });

  useEffect(() => {
    if (institution && season) {
      loadDashboardData();
      loadChartData();
      loadExpectedPayments();
    }
  }, [institution, season]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard', {
        params: {
          institutionId: institution._id,
          seasonId: season._id,
        },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const params = {
        institutionId: institution._id,
        seasonId: season._id,
      };

      // Load all chart data in parallel
      const [incomeExpense, studentGrowth, paymentMethods, expenseCategories] = await Promise.all([
        api.get('/reports/income-expense-chart', { params }),
        api.get('/reports/chart/student-growth', { params }),
        api.get('/reports/chart/payment-methods', { params }),
        api.get('/reports/expense-category-stats', { params })
      ]);

      setIncomeExpenseData(incomeExpense.data);
      setStudentGrowthData(studentGrowth.data);
      setPaymentMethodsData(paymentMethods.data);
      setExpenseCategoriesData(expenseCategories.data);
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadExpectedPayments = async () => {
    try {
      const params = {
        institutionId: institution._id,
        seasonId: season._id,
      };

      const response = await api.get('/payment-plans', params);
      const paymentPlans = response.data;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      const endOfWeek = new Date(startOfToday);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      const categorized = {
        today: [],
        thisWeek: [],
        thisMonth: [],
        nextMonth: [],
        overdue: [],
        pendingCreditCard: []
      };

      // Check for pending credit card payments
      paymentPlans.forEach(plan => {
        if (plan.isPendingPayment && plan.paymentType === 'creditCard' && plan.paymentDate) {
          const paymentDate = new Date(plan.paymentDate);
          if (paymentDate <= now) {
            // Payment date has arrived, should be processed
            categorized.pendingCreditCard.push({
              student: plan.student,
              course: plan.course,
              amount: plan.discountedAmount,
              paymentDate: paymentDate,
              paymentPlanId: plan._id,
              isPending: true
            });
          }
        }
      });

      paymentPlans.forEach(plan => {
        plan.installments?.forEach(installment => {
          if (!installment.isPaid) {
            const dueDate = new Date(installment.dueDate);
            const remaining = installment.amount - (installment.paidAmount || 0);

            const payment = {
              student: plan.student,
              course: plan.course,
              installmentNumber: installment.installmentNumber,
              amount: remaining,
              dueDate: dueDate,
              paymentPlanId: plan._id
            };

            if (dueDate < startOfToday) {
              categorized.overdue.push(payment);
            } else if (dueDate >= startOfToday && dueDate < endOfToday) {
              categorized.today.push(payment);
            } else if (dueDate >= endOfToday && dueDate < endOfWeek) {
              categorized.thisWeek.push(payment);
            } else if (dueDate >= endOfWeek && dueDate <= endOfMonth) {
              categorized.thisMonth.push(payment);
            } else if (dueDate > endOfMonth && dueDate <= endOfNextMonth) {
              categorized.nextMonth.push(payment);
            }
          }
        });
      });

      setExpectedPayments(categorized);
    } catch (error) {
      console.error('Error loading expected payments:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Panel yükleniyor..." />;
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
        Panel
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Öğrenci"
            value={stats.totalStudents}
            icon={<PeopleIcon />}
            color="primary"
            subtitle={`${stats.activeStudents} aktif`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Gelir"
            value={`₺${(stats.totalIncome || 0).toLocaleString('tr-TR')}`}
            icon={<IncomeIcon />}
            color="success"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Gider"
            value={`₺${(stats.totalExpenses || 0).toLocaleString('tr-TR')}`}
            icon={<ExpenseIcon />}
            color="error"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Kasa Bakiyesi"
            value={`₺${(stats.totalCashRegisterBalance || 0).toLocaleString('tr-TR')}`}
            icon={<MoneyIcon />}
            color="warning"
          />
        </Grid>

        {/* Net Income */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Net Gelir
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <Typography variant="h3" color={stats.netIncome >= 0 ? "success.main" : "error.main"}>
                ₺{(stats.netIncome || 0).toLocaleString('tr-TR')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Toplam Gelir - Toplam Gider
            </Typography>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Hızlı Özet
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Net Gelir:</Typography>
                <Typography
                  variant="h6"
                  color={(stats.totalIncome || 0) - (stats.totalExpenses || 0) >= 0 ? 'success.main' : 'error.main'}
                >
                  ₺{((stats.totalIncome || 0) - (stats.totalExpenses || 0)).toLocaleString('tr-TR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1">Ortalama Öğrenci Başı Gelir:</Typography>
                <Typography variant="h6">
                  ₺
                  {stats.activeStudents > 0
                    ? Math.round(stats.totalIncome / stats.activeStudents).toLocaleString('tr-TR')
                    : 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Expected Payments Widget */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Beklenen Ödemeler
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="error.dark" gutterBottom>
                    Gecikmiş
                  </Typography>
                  <Typography variant="h5" color="error.dark">
                    {expectedPayments.overdue.length}
                  </Typography>
                  <Typography variant="body2" color="error.dark">
                    ₺{expectedPayments.overdue.reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="warning.dark" gutterBottom>
                    Bugün
                  </Typography>
                  <Typography variant="h5" color="warning.dark">
                    {expectedPayments.today.length}
                  </Typography>
                  <Typography variant="body2" color="warning.dark">
                    ₺{expectedPayments.today.reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="info.dark" gutterBottom>
                    Bu Hafta
                  </Typography>
                  <Typography variant="h5" color="info.dark">
                    {expectedPayments.thisWeek.length}
                  </Typography>
                  <Typography variant="body2" color="info.dark">
                    ₺{expectedPayments.thisWeek.reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="success.dark" gutterBottom>
                    Bu Ay
                  </Typography>
                  <Typography variant="h5" color="success.dark">
                    {expectedPayments.thisMonth.length}
                  </Typography>
                  <Typography variant="body2" color="success.dark">
                    ₺{expectedPayments.thisMonth.reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={2.4}>
                <Box sx={{ p: 2, bgcolor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Gelecek Ay
                  </Typography>
                  <Typography variant="h5" color="text.primary">
                    {expectedPayments.nextMonth.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ₺{expectedPayments.nextMonth.reduce((sum, p) => sum + p.amount, 0).toLocaleString('tr-TR')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Income vs Expense Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Gelir ve Gider Trendi (Son 12 Ay)
            </Typography>
            {incomeExpenseData.length > 0 && (
              <Line
                data={{
                  labels: incomeExpenseData.map(d => d.period),
                  datasets: [
                    {
                      label: 'Gelir',
                      data: incomeExpenseData.map(d => d.income),
                      borderColor: 'rgb(75, 192, 192)',
                      backgroundColor: 'rgba(75, 192, 192, 0.2)',
                      tension: 0.3
                    },
                    {
                      label: 'Gider',
                      data: incomeExpenseData.map(d => d.expense),
                      borderColor: 'rgb(255, 99, 132)',
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      tension: 0.3
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => '₺' + value.toLocaleString('tr-TR')
                      }
                    }
                  }
                }}
              />
            )}
          </Paper>
        </Grid>

        {/* Payment Methods Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ödeme Yöntemleri Dağılımı
            </Typography>
            {paymentMethodsData.length > 0 && (
              <Pie
                data={{
                  labels: paymentMethodsData.map(d => d._id || 'Diğer'),
                  datasets: [{
                    data: paymentMethodsData.map(d => d.totalAmount),
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.8)',
                      'rgba(54, 162, 235, 0.8)',
                      'rgba(255, 206, 86, 0.8)',
                      'rgba(75, 192, 192, 0.8)',
                      'rgba(153, 102, 255, 0.8)',
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          return `${label}: ₺${value.toLocaleString('tr-TR')}`;
                        }
                      }
                    }
                  }
                }}
              />
            )}
          </Paper>
        </Grid>

        {/* Student Growth Chart */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Öğrenci Kayıt Trendi (Son 12 Ay)
            </Typography>
            {studentGrowthData.length > 0 && (
              <Bar
                data={{
                  labels: studentGrowthData.map(d => d.period),
                  datasets: [{
                    label: 'Yeni Öğrenci Sayısı',
                    data: studentGrowthData.map(d => d.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            )}
          </Paper>
        </Grid>

        {/* Expense Categories Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Gider Kategorileri Dağılımı
            </Typography>
            {expenseCategoriesData.length > 0 && (
              <Doughnut
                data={{
                  labels: expenseCategoriesData.map(d => d.categoryName || d._id || 'Diğer'),
                  datasets: [{
                    data: expenseCategoriesData.map(d => d.totalAmount),
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.8)',
                      'rgba(54, 162, 235, 0.8)',
                      'rgba(255, 206, 86, 0.8)',
                      'rgba(75, 192, 192, 0.8)',
                      'rgba(153, 102, 255, 0.8)',
                      'rgba(255, 159, 64, 0.8)',
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          return `${label}: ₺${value.toLocaleString('tr-TR')}`;
                        }
                      }
                    }
                  }
                }}
              />
            )}
          </Paper>
        </Grid>

        {/* Pending Credit Card Payments Widget */}
        {expectedPayments.pendingCreditCard.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="warning.main">
                ⏰ Vadesi Gelen Kredi Kartı Ödemeleri
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Bu ödemeler beklemede - ödeme tarihi geldi, kasaya işlenmeyi bekliyor
              </Typography>
              <Box sx={{ mt: 2 }}>
                {expectedPayments.pendingCreditCard.map((payment, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      mb: 1,
                      bgcolor: 'warning.light',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {payment.student?.firstName} {payment.student?.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {payment.course?.name}
                      </Typography>
                      <Typography variant="caption">
                        Ödeme Tarihi: {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="warning.dark">
                        ₺{payment.amount?.toLocaleString('tr-TR')}
                      </Typography>
                      <Typography variant="caption">
                        Kredi Kartı - Bekliyor
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Dashboard;
