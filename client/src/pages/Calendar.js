import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  Delete,
  Add,
  PersonAdd,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import CalendarDay from '../components/Calendar/CalendarDay';
import AutoScheduleDialog from '../components/Schedule/AutoScheduleDialog';
import BulkDeleteLessonsDialog from '../components/Calendar/BulkDeleteLessonsDialog';
import CreateLessonDialog from '../components/Calendar/CreateLessonDialog';
import CreateTrialLessonDialog from '../components/Calendar/CreateTrialLessonDialog';
import LessonDetailDialog from '../components/Calendar/LessonDetailDialog';
import TrialLessonDetailDialog from '../components/Calendar/TrialLessonDetailDialog';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Calendar = () => {
  const { institution, season } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState({});
  const [trialLessons, setTrialLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [createLessonOpen, setCreateLessonOpen] = useState(false);
  const [createTrialLessonOpen, setCreateTrialLessonOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState(null);
  const [lessonDetailOpen, setLessonDetailOpen] = useState(false);
  const [trialLessonDetailOpen, setTrialLessonDetailOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Menu for day click
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuDate, setMenuDate] = useState(null);

  useEffect(() => {
    if (institution && season) {
      loadAllData();
    }
  }, [institution, season, currentDate]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadLessons(), loadTrialLessons()]);
    } finally {
      setLoading(false);
    }
  };

  const loadLessons = async () => {
    try {
      const response = await api.get('/scheduled-lessons', {
        params: {
          institution: institution._id,
          season: season._id,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        },
      });

      // Group lessons by date
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

      // Group trial lessons by date
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

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Pazartesi'yi haftanın ilk günü yapmak için: 0=Pazar -> 6, 1=Pazartesi -> 0
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
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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

  const handleLessonDetailClose = () => {
    setLessonDetailOpen(false);
    setSelectedLesson(null);
  };

  const handleTrialLessonDetailClose = () => {
    setTrialLessonDetailOpen(false);
    setSelectedTrialLesson(null);
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

  const handleDayClick = (date, event) => {
    setMenuDate(date);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuDate(null);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={previousMonth}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h5">
              {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
            </Typography>
            <IconButton onClick={nextMonth}>
              <ChevronRight />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setBulkDeleteOpen(true)}
            >
              Toplu Ders Sil
            </Button>
            <Button
              variant="contained"
              startIcon={<CalendarMonth />}
              onClick={() => setAutoScheduleOpen(true)}
            >
              Otomatik Program Oluştur
            </Button>
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          <Chip
            size="small"
            sx={{ backgroundColor: 'primary.light', color: 'white' }}
            label="Planlanmış Ders"
          />
          <Chip
            size="small"
            sx={{ backgroundColor: 'success.light', color: 'white' }}
            label="Tamamlanmış Ders"
          />
          <Chip
            size="small"
            sx={{ backgroundColor: '#ff9800', color: 'white', border: '2px dashed rgba(255,255,255,0.5)' }}
            label="Deneme Dersi (Bekliyor)"
          />
          <Chip
            size="small"
            sx={{ backgroundColor: '#4caf50', color: 'white', border: '2px dashed rgba(255,255,255,0.5)' }}
            label="Deneme Dersi (Tamamlandı)"
          />
          <Chip
            size="small"
            sx={{ backgroundColor: '#2196f3', color: 'white', border: '2px dashed rgba(255,255,255,0.5)' }}
            label="Deneme Dersi (Kayıt Oldu)"
          />
        </Box>
      </Paper>

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
                onLessonClick={handleLessonClick}
                onTrialLessonClick={handleTrialLessonClick}
                onDayClick={handleDayClick}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Day Click Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
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
