import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import DayScheduleView from './DayScheduleView';
import DayDetailDialog from './DayDetailDialog';
import CreateTrialLessonDialog from './CreateTrialLessonDialog';
import TrialLessonDetailDialog from './TrialLessonDetailDialog';

const WeeklyCalendarView = ({
  currentDate,
  lessons = [],
  trialLessons = [],
  onWeekChange,
  onUpdated,
}) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [createTrialLessonOpen, setCreateTrialLessonOpen] = useState(false);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState(null);
  const [trialLessonDetailOpen, setTrialLessonDetailOpen] = useState(false);

  // Get the week's dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(date.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Group lessons and trial lessons by day
  const eventsByDay = useMemo(() => {
    const result = {};

    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      result[dateStr] = {
        lessons: [],
        trialLessons: [],
      };
    });

    lessons.forEach(lesson => {
      const lessonDate = new Date(lesson.date);
      const dateStr = lessonDate.toISOString().split('T')[0];
      if (result[dateStr]) {
        result[dateStr].lessons.push(lesson);
      }
    });

    trialLessons.forEach(trial => {
      const trialDate = new Date(trial.scheduledDate);
      const dateStr = trialDate.toISOString().split('T')[0];
      if (result[dateStr]) {
        result[dateStr].trialLessons.push(trial);
      }
    });

    return result;
  }, [weekDates, lessons, trialLessons]);

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange?.(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange?.(newDate);
  };

  const handleToday = () => {
    onWeekChange?.(new Date());
  };

  const handleDayClick = (date) => {
    setSelectedDay(date);
    setDayDetailOpen(true);
  };

  const handleDayDetailClose = () => {
    setDayDetailOpen(false);
    setSelectedDay(null);
  };

  const handleTrialLessonClick = (trialLesson) => {
    setSelectedTrialLesson(trialLesson);
    setTrialLessonDetailOpen(true);
  };

  const handleTrialLessonDetailClose = () => {
    setTrialLessonDetailOpen(false);
    setSelectedTrialLesson(null);
  };

  const handleUpdated = () => {
    if (onUpdated) onUpdated();
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startStr = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('tr-TR', { weekday: 'short' });
  };

  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handlePrevWeek}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: '220px', textAlign: 'center' }}>
                {formatWeekRange()}
              </Typography>
              <IconButton onClick={handleNextWeek}>
                <ChevronRight />
              </IconButton>
              <IconButton onClick={handleToday} color="primary" title="Bugün">
                <Today />
              </IconButton>
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">Renk:</Typography>
              <Chip size="small" label="Ders" sx={{ bgcolor: '#2196f3', color: 'white', height: 20, fontSize: 10 }} />
              <Chip size="small" label="Deneme" sx={{ bgcolor: '#ff9800', color: 'white', height: 20, fontSize: 10 }} />
              <Chip size="small" label="Tamamlandı" sx={{ bgcolor: '#4caf50', color: 'white', height: 20, fontSize: 10 }} />
              <Chip size="small" label="Kayıt" sx={{ bgcolor: '#9c27b0', color: 'white', height: 20, fontSize: 10 }} />
            </Box>
          </Box>
        </Paper>

        {/* Week Grid */}
        <Paper sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Time column */}
          <Box
            sx={{
              width: '60px',
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            {/* Empty header cell */}
            <Box
              sx={{
                height: '48px',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            />
            {/* Time labels will be in DayScheduleView */}
          </Box>

          {/* Days */}
          <Box sx={{ flex: 1, display: 'flex', overflow: 'auto' }}>
            {weekDates.map((date, index) => {
              const dateStr = date.toISOString().split('T')[0];
              const dayEvents = eventsByDay[dateStr] || { lessons: [], trialLessons: [] };
              const eventCount = dayEvents.lessons.length + dayEvents.trialLessons.length;

              return (
                <Box
                  key={dateStr}
                  sx={{
                    flex: 1,
                    minWidth: '120px',
                    borderRight: index < 6 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Day header */}
                  <Box
                    onClick={() => handleDayClick(date)}
                    sx={{
                      height: '48px',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: isToday(date) ? 'primary.light' : 'grey.50',
                      color: isToday(date) ? 'white' : 'inherit',
                      '&:hover': {
                        bgcolor: isToday(date) ? 'primary.main' : 'grey.200',
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isToday(date) ? 'bold' : 'normal',
                        textTransform: 'uppercase',
                      }}
                    >
                      {getDayName(date)}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: isToday(date) ? 'bold' : 'normal' }}
                    >
                      {date.getDate()}
                    </Typography>
                    {eventCount > 0 && (
                      <Chip
                        label={eventCount}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 10,
                          mt: 0.5,
                          bgcolor: isToday(date) ? 'white' : 'primary.main',
                          color: isToday(date) ? 'primary.main' : 'white',
                        }}
                      />
                    )}
                  </Box>

                  {/* Day schedule */}
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <DayScheduleView
                      date={date}
                      lessons={dayEvents.lessons}
                      trialLessons={dayEvents.trialLessons}
                      onTrialLessonClick={handleTrialLessonClick}
                      compact
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* Day Detail Dialog */}
      {selectedDay && (
        <DayDetailDialog
          open={dayDetailOpen}
          onClose={handleDayDetailClose}
          date={selectedDay}
          lessons={eventsByDay[selectedDay.toISOString().split('T')[0]]?.lessons || []}
          trialLessons={eventsByDay[selectedDay.toISOString().split('T')[0]]?.trialLessons || []}
          onDateChange={(newDate) => setSelectedDay(newDate)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Trial Lesson Detail Dialog */}
      {selectedTrialLesson && (
        <TrialLessonDetailDialog
          open={trialLessonDetailOpen}
          onClose={handleTrialLessonDetailClose}
          trialLesson={selectedTrialLesson}
          onUpdated={handleUpdated}
          onDeleted={handleUpdated}
        />
      )}
    </>
  );
};

export default WeeklyCalendarView;
