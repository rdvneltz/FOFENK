import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Payment as PaymentIcon } from '@mui/icons-material';

const CalendarDay = ({
  date,
  isCurrentMonth,
  isToday,
  lessons,
  trialLessons,
  expenses,
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

  const getExpenseColor = (status) => {
    switch (status) {
      case 'overdue':
        return '#f44336'; // Red
      case 'pending':
        return '#ff9800'; // Orange
      default:
        return '#9e9e9e'; // Grey
    }
  };

  // Calculate how many slots we have for events
  const maxVisibleEvents = expenses && expenses.length > 0 ? 3 : 4;
  const visibleEvents = allEvents.slice(0, maxVisibleEvents);
  const remainingEvents = allEvents.length - maxVisibleEvents;

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: isToday ? 'bold' : 'normal',
            color: isCurrentMonth ? 'text.primary' : 'text.disabled',
          }}
        >
          {date.getDate()}
        </Typography>
        {/* Expense indicator */}
        {expenses && expenses.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              px: 0.5,
              py: 0.2,
              borderRadius: 1,
              bgcolor: expenses.some(e => e.status === 'overdue') ? 'error.light' : 'warning.light',
              color: 'white',
              fontSize: '0.6rem',
            }}
            title={expenses.map(e => `${e.description}: ${e.amount?.toLocaleString('tr-TR')}₺`).join('\n')}
          >
            <PaymentIcon sx={{ fontSize: 10 }} />
            {expenses.length > 1 ? expenses.length : (expenses[0].amount?.toLocaleString('tr-TR') + '₺')}
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'hidden' }}>
        {/* Expense items first if overdue */}
        {expenses && expenses.filter(e => e.status === 'overdue').map((expense, index) => (
          <Box
            key={`expense-${expense._id || index}`}
            sx={{
              fontSize: '0.7rem',
              p: 0.5,
              borderRadius: 1,
              backgroundColor: getExpenseColor(expense.status),
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
            title={`GİDER: ${expense.description} - ${expense.amount?.toLocaleString('tr-TR')}₺`}
          >
            <PaymentIcon sx={{ fontSize: 12 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {expense.category}: {expense.amount?.toLocaleString('tr-TR')}₺
            </span>
          </Box>
        ))}

        {visibleEvents.map((event, index) => (
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
        {remainingEvents > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
            +{remainingEvents} daha
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CalendarDay;
