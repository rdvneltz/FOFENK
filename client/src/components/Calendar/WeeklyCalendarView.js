import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import { Payment as PaymentIcon } from '@mui/icons-material';
import DayScheduleView from './DayScheduleView';
import DayDetailDialog from './DayDetailDialog';
import CreateTrialLessonDialog from './CreateTrialLessonDialog';
import TrialLessonDetailDialog from './TrialLessonDetailDialog';
import LessonDetailDialog from './LessonDetailDialog';

// Helper to get local date string (YYYY-MM-DD) without timezone issues
const getLocalDateStr = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WeeklyCalendarView = ({
  currentDate,
  lessons = [],
  trialLessons = [],
  expenses = [],
  onWeekChange,
  onUpdated,
  onExpenseClick,
}) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [createTrialLessonOpen, setCreateTrialLessonOpen] = useState(false);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState(null);
  const [trialLessonDetailOpen, setTrialLessonDetailOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDetailOpen, setLessonDetailOpen] = useState(false);

  // Get the week's dates (Monday to Sunday)
  const weekDates = useMemo(() => {
    const date = new Date(currentDate);
    date.setHours(12, 0, 0, 0); // Normalize to noon to avoid DST issues
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(date);
    monday.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      d.setHours(12, 0, 0, 0);
      return d;
    });
  }, [currentDate]);

  // Group lessons, trial lessons, and expenses by day
  const eventsByDay = useMemo(() => {
    const result = {};

    weekDates.forEach(date => {
      const dateStr = getLocalDateStr(date);
      result[dateStr] = {
        lessons: [],
        trialLessons: [],
        expenses: [],
      };
    });

    lessons.forEach(lesson => {
      const dateStr = getLocalDateStr(lesson.date);
      if (result[dateStr]) {
        result[dateStr].lessons.push(lesson);
      }
    });

    trialLessons.forEach(trial => {
      const dateStr = getLocalDateStr(trial.scheduledDate);
      if (result[dateStr]) {
        result[dateStr].trialLessons.push(trial);
      }
    });

    expenses.forEach(expense => {
      if (expense.dueDate) {
        const dateStr = getLocalDateStr(expense.dueDate);
        if (result[dateStr]) {
          result[dateStr].expenses.push(expense);
        }
      }
    });

    return result;
  }, [weekDates, lessons, trialLessons, expenses]);

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

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDetailOpen(true);
  };

  const handleLessonDetailClose = () => {
    setLessonDetailOpen(false);
    setSelectedLesson(null);
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

  const getDayNameShort = (date) => {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return days[date.getDay()];
  };

  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Week Grid - No separate header, uses parent's header */}
        <Paper sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Time column */}
          <Box
            sx={{
              width: '50px',
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.50',
            }}
          >
            {/* Empty header cell - matches day header height */}
            <Box
              sx={{
                height: '40px',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            />
            {/* Time labels will be in DayScheduleView */}
          </Box>

          {/* Days */}
          <Box sx={{ flex: 1, display: 'flex', overflow: 'auto' }}>
            {weekDates.map((date, index) => {
              const dateStr = getLocalDateStr(date);
              const dayEvents = eventsByDay[dateStr] || { lessons: [], trialLessons: [], expenses: [] };
              const eventCount = dayEvents.lessons.length + dayEvents.trialLessons.length;
              const expenseCount = dayEvents.expenses.length;
              const totalExpenseAmount = dayEvents.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

              return (
                <Box
                  key={dateStr}
                  sx={{
                    flex: 1,
                    minWidth: '100px',
                    borderRight: index < 6 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Day header - compact layout */}
                  <Box
                    onClick={() => handleDayClick(date)}
                    sx={{
                      height: '40px',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      bgcolor: isToday(date) ? 'primary.main' : 'grey.50',
                      color: isToday(date) ? 'white' : 'inherit',
                      '&:hover': {
                        bgcolor: isToday(date) ? 'primary.dark' : 'grey.200',
                      },
                      py: 0.5,
                    }}
                  >
                    {/* Day name and date on same line: "Per. 4" */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday(date) ? 'bold' : 500,
                        fontSize: '0.85rem',
                      }}
                    >
                      {getDayNameShort(date)}. {date.getDate()}
                    </Typography>
                    {/* Event count below */}
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {eventCount > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.7rem',
                            opacity: 0.85,
                            color: isToday(date) ? 'white' : 'primary.main',
                            fontWeight: 500,
                          }}
                        >
                          {eventCount} ders
                        </Typography>
                      )}
                      {expenseCount > 0 && (
                        <Chip
                          icon={<PaymentIcon sx={{ fontSize: 10, color: 'inherit' }} />}
                          label={`${totalExpenseAmount.toLocaleString('tr-TR')}₺`}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.6rem',
                            bgcolor: isToday(date) ? 'error.light' : 'error.main',
                            color: 'white',
                            '& .MuiChip-label': { px: 0.5 },
                            '& .MuiChip-icon': { ml: 0.3 },
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Day schedule */}
                  <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <DayScheduleView
                      date={date}
                      lessons={dayEvents.lessons}
                      trialLessons={dayEvents.trialLessons}
                      onLessonClick={handleLessonClick}
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
          lessons={eventsByDay[getLocalDateStr(selectedDay)]?.lessons || []}
          trialLessons={eventsByDay[getLocalDateStr(selectedDay)]?.trialLessons || []}
          expenses={eventsByDay[getLocalDateStr(selectedDay)]?.expenses || []}
          onDateChange={(newDate) => setSelectedDay(newDate)}
          onUpdated={handleUpdated}
          onExpenseClick={onExpenseClick}
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

      {/* Lesson Detail Dialog */}
      {selectedLesson && (
        <LessonDetailDialog
          open={lessonDetailOpen}
          onClose={handleLessonDetailClose}
          lesson={selectedLesson}
          onUpdated={handleUpdated}
          onDeleted={handleUpdated}
        />
      )}
    </>
  );
};

export default WeeklyCalendarView;
