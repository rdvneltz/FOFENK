import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import DayScheduleView from './DayScheduleView';
import DayDetailDialog from './DayDetailDialog';
import CreateTrialLessonDialog from './CreateTrialLessonDialog';
import TrialLessonDetailDialog from './TrialLessonDetailDialog';

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

  // Group lessons and trial lessons by day
  const eventsByDay = useMemo(() => {
    const result = {};

    weekDates.forEach(date => {
      const dateStr = getLocalDateStr(date);
      result[dateStr] = {
        lessons: [],
        trialLessons: [],
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

    return result;
  }, [weekDates, lessons, trialLessons]);

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
              const dayEvents = eventsByDay[dateStr] || { lessons: [], trialLessons: [] };
              const eventCount = dayEvents.lessons.length + dayEvents.trialLessons.length;

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
          lessons={eventsByDay[getLocalDateStr(selectedDay)]?.lessons || []}
          trialLessons={eventsByDay[getLocalDateStr(selectedDay)]?.trialLessons || []}
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
