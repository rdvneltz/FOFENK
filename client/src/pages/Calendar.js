import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { ChevronLeft, ChevronRight, CalendarMonth } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import CalendarDay from '../components/Calendar/CalendarDay';
import AutoScheduleDialog from '../components/Schedule/AutoScheduleDialog';
import LessonDetailDialog from '../components/Calendar/LessonDetailDialog';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const Calendar = () => {
  const { institution, season } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDetailOpen, setLessonDetailOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (institution && season) {
      loadLessons();
    }
  }, [institution, season, currentDate]);

  const loadLessons = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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
    loadLessons(); // Reload calendar
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDetailOpen(true);
  };

  const handleLessonDetailClose = () => {
    setLessonDetailOpen(false);
    setSelectedLesson(null);
  };

  const handleLessonUpdated = () => {
    loadLessons(); // Reload calendar
    setSnackbar({
      open: true,
      message: 'Ders başarıyla güncellendi!',
      severity: 'success'
    });
  };

  const handleLessonDeleted = () => {
    setLessonDetailOpen(false);
    setSelectedLesson(null);
    loadLessons(); // Reload calendar
    setSnackbar({
      open: true,
      message: 'Ders başarıyla silindi!',
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
          <Button
            variant="contained"
            startIcon={<CalendarMonth />}
            onClick={() => setAutoScheduleOpen(true)}
          >
            Otomatik Program Oluştur
          </Button>
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
                onLessonClick={handleLessonClick}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Auto Schedule Dialog */}
      <AutoScheduleDialog
        open={autoScheduleOpen}
        onClose={() => setAutoScheduleOpen(false)}
        onSuccess={handleAutoScheduleSuccess}
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
