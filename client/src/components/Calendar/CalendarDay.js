import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const CalendarDay = ({
  date,
  isCurrentMonth,
  isToday,
  lessons,
  trialLessons,
  onLessonClick,
  onTrialLessonClick,
  onDayClick,
  onDayDoubleClick
}) => {
  const handleDayClick = (e) => {
    // Only allow clicking on current month days
    if (isCurrentMonth && onDayClick) {
      onDayClick(date, e);
    }
  };

  const handleDayDoubleClick = (e) => {
    if (isCurrentMonth && onDayDoubleClick) {
      e.preventDefault();
      onDayDoubleClick(date);
    }
  };

  // Combine and sort all events by time
  const allEvents = [];

  if (lessons) {
    lessons.forEach(lesson => {
      allEvents.push({
        ...lesson,
        type: 'lesson',
        sortTime: lesson.startTime
      });
    });
  }

  if (trialLessons) {
    trialLessons.forEach(trial => {
      allEvents.push({
        ...trial,
        type: 'trial',
        sortTime: trial.scheduledTime
      });
    });
  }

  // Sort by time
  allEvents.sort((a, b) => (a.sortTime || '').localeCompare(b.sortTime || ''));

  const getTrialLessonColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4caf50'; // Green
      case 'cancelled':
        return '#f44336'; // Red
      case 'converted':
        return '#2196f3'; // Blue
      default:
        return '#ff9800'; // Orange for pending
    }
  };

  const getLessonColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success.light';
      case 'cancelled':
        return 'error.light';
      case 'postponed':
        return 'warning.light';
      default:
        return 'primary.light';
    }
  };

  return (
    <Paper
      elevation={isToday ? 3 : 1}
      sx={{
        minHeight: 140,
        height: '100%',
        p: 1,
        cursor: 'pointer',
        backgroundColor: isCurrentMonth ? 'background.paper' : 'grey.100',
        border: isToday ? 2 : 0,
        borderColor: 'primary.main',
        '&:hover': {
          elevation: 3,
          backgroundColor: isCurrentMonth ? 'grey.50' : 'grey.200',
        },
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={handleDayClick}
      onDoubleClick={handleDayDoubleClick}
    >
      <Typography
        variant="body1"
        sx={{
          fontWeight: isToday ? 'bold' : 'normal',
          color: isCurrentMonth ? 'text.primary' : 'text.disabled',
          mb: 1,
        }}
      >
        {date.getDate()}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'hidden' }}>
        {allEvents.slice(0, 4).map((event, index) => (
          event.type === 'trial' ? (
            // Trial Lesson
            <Box
              key={`trial-${event._id || index}`}
              sx={{
                fontSize: '0.75rem',
                p: 0.75,
                borderRadius: 1,
                backgroundColor: getTrialLessonColor(event.status),
                color: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                lineHeight: 1.3,
                cursor: 'pointer',
                border: '2px dashed rgba(255,255,255,0.5)',
                '&:hover': {
                  opacity: 0.8,
                  transform: 'scale(1.02)',
                },
                transition: 'all 0.2s',
              }}
              title={`DENEME: ${event.scheduledTime} - ${event.firstName} ${event.lastName} (${event.course?.name || 'Ders'})`}
              onClick={(e) => {
                e.stopPropagation();
                if (onTrialLessonClick) onTrialLessonClick(event);
              }}
            >
              <Box sx={{ fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>&#9733;</span> {/* Star icon for trial */}
                {event.scheduledTime}
              </Box>
              <Box sx={{ fontSize: '0.65rem', mt: 0.3 }}>
                {event.firstName} {event.lastName?.charAt(0)}.
              </Box>
            </Box>
          ) : (
            // Regular Lesson
            <Box
              key={`lesson-${event._id || index}`}
              sx={{
                fontSize: '0.75rem',
                p: 0.75,
                borderRadius: 1,
                backgroundColor: getLessonColor(event.status),
                color: 'white',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                lineHeight: 1.3,
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8,
                  transform: 'scale(1.02)',
                },
                transition: 'all 0.2s',
              }}
              title={`${event.startTime}-${event.endTime} ${event.course?.name || 'Ders'}${event.notes ? ` - ${event.notes}` : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onLessonClick) onLessonClick(event);
              }}
            >
              <Box sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                {event.startTime}-{event.endTime}
              </Box>
              <Box sx={{ fontSize: '0.65rem', mt: 0.3 }}>
                {event.notes ? `${event.course?.name || 'Ders'} - ${event.notes}` : (event.course?.name || 'Ders')}
              </Box>
            </Box>
          )
        ))}
        {allEvents.length > 4 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
            +{allEvents.length - 4} daha
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CalendarDay;
