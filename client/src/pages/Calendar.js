import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  Delete,
  Add,
  PersonAdd,
  ViewWeek,
  ViewModule,
  Today,
  Visibility,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import CalendarDay from '../components/Calendar/CalendarDay';
import AutoScheduleDialog from '../components/Schedule/AutoScheduleDialog';
import BulkDeleteLessonsDialog from '../components/Calendar/BulkDeleteLessonsDialog';
import CreateLessonDialog from '../components/Calendar/CreateLessonDialog';
import CreateTrialLessonDialog from '../components/Calendar/CreateTrialLessonDialog';
import LessonDetailDialog from '../components/Calendar/LessonDetailDialog';
import TrialLessonDetailDialog from '../components/Calendar/TrialLessonDetailDialog';
import DayDetailDialog from '../components/Calendar/DayDetailDialog';
import WeeklyCalendarView from '../components/Calendar/WeeklyCalendarView';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Calendar = () => {
  const { institution, season } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'weekly'
  const [lessons, setLessons] = useState({});
  const [lessonsArray, setLessonsArray] = useState([]);
  const [trialLessons, setTrialLessons] = useState({});
  const [trialLessonsArray, setTrialLessonsArray] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState({});
  const [pendingExpensesArray, setPendingExpensesArray] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expense pay dialog
  const [expensePayOpen, setExpensePayOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [payFormData, setPayFormData] = useState({
    amount: '',
    cashRegisterId: '',
    notes: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);
  const [createTrialLessonOpen, setCreateTrialLessonOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState(null);
  const [lessonDetailOpen, setLessonDetailOpen] = useState(false);
  const [trialLessonDetailOpen, setTrialLessonDetailOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Menu for day click
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDate, setMenuDate] = useState(null);

  useEffect(() => {
    if (institution && season) {
      loadAllData();
    }
  }, [institution, season, currentDate, viewMode]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadLessons(), loadTrialLessons(), loadPendingExpenses(), loadCashRegisters()]);
    } finally {
      setLoading(false);
    }
  };

  const loadCashRegisters = async () => {
    try {
      const response = await api.get('/cash-registers', {
        params: { institution: institution._id },
      });
      setCashRegisters(response.data);
    } catch (error) {
      console.error('Error loading cash registers:', error);
    }
  };

  const loadLessons = async () => {
    try {
      // For weekly view, we need to fetch a different range
      let month = currentDate.getMonth() + 1;
      let year = currentDate.getFullYear();

      const response = await api.get('/scheduled-lessons', {
        params: {
          institution: institution._id,
          season: season._id,
          month,
          year,
        },
      });

      // Store as array for weekly view
      setLessonsArray(response.data);

      // Group lessons by date for monthly view
      const grouped = {};
      response.data.forEach((lesson) => {
        const date = new Date(lesson.date).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(lesson);
      });
      setLessons(grouped);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const loadTrialLessons = async () => {
    try {
      const response = await api.get('/trial-lessons', {
        params: {
          institution: institution._id,
          season: season._id,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        },
      });

      // Store as array for weekly view
      setTrialLessonsArray(response.data);

      // Group trial lessons by date for monthly view
      const grouped = {};
      response.data.forEach((trial) => {
        const date = new Date(trial.scheduledDate).toDateString();
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(trial);
      });
      setTrialLessons(grouped);
    } catch (error) {
      console.error('Error loading trial lessons:', error);
    }
  };

  const loadPendingExpenses = async () => {
    try {
      const response = await api.get('/recurring-expenses/pending/list', {
        params: {
          institution: institution._id,
          season: season._id,
          days: 730  // Show expenses up to 2 years ahead
        },
      });

      // Combine all pending expenses
      const allExpenses = [
        ...(response.data.overdue || []),
        ...(response.data.thisWeek || []),
        ...(response.data.upcoming || [])
      ];

      // Store as array
      setPendingExpensesArray(allExpenses);

      // Group by due date for monthly view
      const grouped = {};
      allExpenses.forEach((expense) => {
        if (expense.dueDate) {
          const date = new Date(expense.dueDate).toDateString();
          if (!grouped[date]) {
            grouped[date] = [];
          }
          grouped[date].push(expense);
        }
      });
      setPendingExpenses(grouped);
    } catch (error) {
      console.error('Error loading pending expenses:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const previousPeriod = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleAutoScheduleSuccess = (result) => {
    setSnackbar({
      open: true,
      message: `Başarıyla ${result.count} ders oluşturuldu!`,
      severity: 'success'
    });
    loadAllData();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDetailOpen(true);
  };

  const handleTrialLessonClick = (trialLesson) => {
    setSelectedTrialLesson(trialLesson);
    setTrialLessonDetailOpen(true);
  };

  const handleExpenseClick = (expense) => {
    setSelectedExpense(expense);
    setPayFormData({
      amount: expense.amount || expense.estimatedAmount || '',
      cashRegisterId: expense.recurringExpense?.defaultCashRegister || cashRegisters[0]?._id || '',
      notes: '',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setExpensePayOpen(true);
  };

  const handlePayExpense = async () => {
    try {
      await api.post(`/recurring-expenses/pay/${selectedExpense._id}`, {
        ...payFormData,
        amount: parseFloat(payFormData.amount),
      });
      setSnackbar({ open: true, message: 'Gider ödendi', severity: 'success' });
      setExpensePayOpen(false);
      setSelectedExpense(null);
      loadPendingExpenses();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Ödeme başarısız', severity: 'error' });
    }
  };

  const handleDayClick = (date, event) => {
    setMenuDate(date);
    setMenuAnchor(event.currentTarget);
  };

  const handleDayDoubleClick = (date) => {
    setSelectedDate(date);
    setDayDetailOpen(true);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuDate(null);
  };

  const handleViewDayDetail = () => {
    setSelectedDate(menuDate);
    setDayDetailOpen(true);
    handleMenuClose();
  };

  const handleCreateLesson = () => {
    setSelectedDate(menuDate);
    setCreateLessonOpen(true);
    handleMenuClose();
  };

  const handleCreateTrialLesson = () => {
    setSelectedDate(menuDate);
    setCreateTrialLessonOpen(true);
    handleMenuClose();
  };

  const handleLessonDetailClose = () => {
    setLessonDetailOpen(false);
    setSelectedLesson(null);
  };

  const handleTrialLessonDetailClose = () => {
    setTrialLessonDetailOpen(false);
    setSelectedTrialLesson(null);
  };

  const handleDayDetailClose = () => {
    setDayDetailOpen(false);
  };

  const handleLessonUpdated = () => {
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Ders başarıyla güncellendi!',
      severity: 'success'
    });
  };

  const handleTrialLessonUpdated = () => {
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Deneme dersi başarıyla güncellendi!',
      severity: 'success'
    });
  };

  const handleLessonDeleted = () => {
    setLessonDetailOpen(false);
    setSelectedLesson(null);
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Ders başarıyla silindi!',
      severity: 'success'
    });
  };

  const handleTrialLessonDeleted = () => {
    setTrialLessonDetailOpen(false);
    setSelectedTrialLesson(null);
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Deneme dersi başarıyla silindi!',
      severity: 'success'
    });
  };

  const handleBulkDeleteSuccess = () => {
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Dersler başarıyla silindi!',
      severity: 'success'
    });
  };

  const handleCreateLessonSuccess = () => {
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Ders başarıyla oluşturuldu!',
      severity: 'success'
    });
  };

  const handleCreateTrialLessonSuccess = () => {
    loadAllData();
    setSnackbar({
      open: true,
      message: 'Deneme dersi başarıyla oluşturuldu!',
      severity: 'success'
    });
  };

  if (loading) {
    return <LoadingSpinner message="Takvim yükleniyor..." />;
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

  const days = getDaysInMonth();
  const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={previousPeriod}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h5" sx={{ minWidth: '200px', textAlign: 'center' }}>
              {viewMode === 'weekly'
                ? `${currentDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} Haftası`
                : currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
              }
            </Typography>
            <IconButton onClick={nextPeriod}>
              <ChevronRight />
            </IconButton>
            <Tooltip title="Bugün">
              <IconButton onClick={goToToday} color="primary">
                <Today />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="monthly">
                <Tooltip title="Aylık Görünüm">
                  <ViewModule />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="weekly">
                <Tooltip title="Haftalık Görünüm">
                  <ViewWeek />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Toplu Sil
            </Button>
            <Button
              variant="contained"
              startIcon={<CalendarMonth />}
              onClick={() => setAutoScheduleOpen(true)}
            >
              Otomatik Program
            </Button>
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 1.5, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Renk Açıklaması:</Typography>
          <Chip
            size="small"
            sx={{ bgcolor: '#2196f3', color: 'white', height: 24 }}
            label="Ders"
          />
          <Chip
            size="small"
            sx={{ bgcolor: '#ff9800', color: 'white', height: 24 }}
            label="Deneme (Bekliyor)"
          />
          <Chip
            size="small"
            sx={{ bgcolor: '#4caf50', color: 'white', height: 24 }}
            label="Tamamlandı"
          />
          <Chip
            size="small"
            sx={{ bgcolor: '#9c27b0', color: 'white', height: 24 }}
            label="Kayıt Oldu"
          />
          <Chip
            size="small"
            sx={{ bgcolor: '#f44336', color: 'white', height: 24 }}
            label="İptal"
          />
        </Box>
      </Paper>

      {/* Calendar View */}
      {viewMode === 'weekly' ? (
        <WeeklyCalendarView
          currentDate={currentDate}
          lessons={lessonsArray}
          trialLessons={trialLessonsArray}
          onWeekChange={setCurrentDate}
          onUpdated={loadAllData}
        />
      ) : (
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={1}>
            {/* Week day headers */}
            {weekDays.map((day) => (
              <Grid item xs={12 / 7} key={day}>
                <Typography variant="subtitle2" align="center" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {day}
                </Typography>
              </Grid>
            ))}

            {/* Calendar days */}
            {days.map((day, index) => (
              <Grid item xs={12 / 7} key={index}>
                <CalendarDay
                  date={day.date}
                  isCurrentMonth={day.isCurrentMonth}
                  isToday={isToday(day.date)}
                  lessons={lessons[day.date.toDateString()]}
                  trialLessons={trialLessons[day.date.toDateString()]}
                  expenses={pendingExpenses[day.date.toDateString()]}
                  onLessonClick={handleLessonClick}
                  onTrialLessonClick={handleTrialLessonClick}
                  onExpenseClick={handleExpenseClick}
                  onDayClick={handleDayClick}
                  onDayDoubleClick={handleDayDoubleClick}
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Day Click Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDayDetail}>
          <ListItemIcon>
            <Visibility fontSize="small" color="info" />
          </ListItemIcon>
          <ListItemText>Gün Detayını Görüntüle</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCreateLesson}>
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText>Yeni Ders Oluştur</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCreateTrialLesson}>
          <ListItemIcon>
            <PersonAdd fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Yeni Deneme Dersi</ListItemText>
        </MenuItem>
      </Menu>

      {/* Auto Schedule Dialog */}
      <AutoScheduleDialog
        open={autoScheduleOpen}
        onClose={() => setAutoScheduleOpen(false)}
        onSuccess={handleAutoScheduleSuccess}
      />

      {/* Bulk Delete Lessons Dialog */}
      <BulkDeleteLessonsDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onSuccess={handleBulkDeleteSuccess}
      />

      {/* Create Single Lesson Dialog */}
      <CreateLessonDialog
        open={createLessonOpen}
        onClose={() => setCreateLessonOpen(false)}
        selectedDate={selectedDate}
        onSuccess={handleCreateLessonSuccess}
      />

      {/* Create Trial Lesson Dialog */}
      <CreateTrialLessonDialog
        open={createTrialLessonOpen}
        onClose={() => setCreateTrialLessonOpen(false)}
        selectedDate={selectedDate}
        onSuccess={handleCreateTrialLessonSuccess}
      />

      {/* Day Detail Dialog */}
      <DayDetailDialog
        open={dayDetailOpen}
        onClose={handleDayDetailClose}
        date={selectedDate}
        lessons={selectedDate ? lessons[selectedDate.toDateString()] || [] : []}
        trialLessons={selectedDate ? trialLessons[selectedDate.toDateString()] || [] : []}
        onDateChange={(newDate) => setSelectedDate(newDate)}
        onUpdated={loadAllData}
      />

      {/* Lesson Detail Dialog */}
      {selectedLesson && (
        <LessonDetailDialog
          open={lessonDetailOpen}
          onClose={handleLessonDetailClose}
          lesson={selectedLesson}
          onUpdated={handleLessonUpdated}
          onDeleted={handleLessonDeleted}
        />
      )}

      {/* Trial Lesson Detail Dialog */}
      {selectedTrialLesson && (
        <TrialLessonDetailDialog
          open={trialLessonDetailOpen}
          onClose={handleTrialLessonDetailClose}
          trialLesson={selectedTrialLesson}
          onUpdated={handleTrialLessonUpdated}
          onDeleted={handleTrialLessonDeleted}
        />
      )}

      {/* Expense Pay Dialog */}
      <Dialog open={expensePayOpen} onClose={() => setExpensePayOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Gider Öde</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ mb: 2, mt: 1, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold">{selectedExpense.description}</Typography>
              <Typography variant="body2" color="text.secondary">
                Vade: {new Date(selectedExpense.dueDate).toLocaleDateString('tr-TR')}
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tutar (TL)"
                type="number"
                value={payFormData.amount}
                onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Kasa</InputLabel>
                <Select
                  value={payFormData.cashRegisterId}
                  onChange={(e) => setPayFormData({ ...payFormData, cashRegisterId: e.target.value })}
                  label="Kasa"
                >
                  {cashRegisters.map((reg) => (
                    <MenuItem key={reg._id} value={reg._id}>{reg.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ödeme Tarihi"
                type="date"
                value={payFormData.expenseDate}
                onChange={(e) => setPayFormData({ ...payFormData, expenseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notlar"
                multiline
                rows={2}
                value={payFormData.notes}
                onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpensePayOpen(false)}>İptal</Button>
          <Button variant="contained" color="success" onClick={handlePayExpense}>Öde</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Calendar;
