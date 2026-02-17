import React, { useState } from 'react';
import { Box, Typography, Paper, Menu, MenuItem, ListItemText, ListItemIcon } from '@mui/material';
import { Payment as PaymentIcon, Star as StarIcon } from '@mui/icons-material';

const CalendarDay = ({
  date,
  isCurrentMonth,
  isToday,
  lessons,
  trialLessons,
  expenses,
  onLessonClick,
  onTrialLessonClick,
  onExpenseClick,
  onDayClick,
  onDayDoubleClick
}) => {
  const [expenseMenuAnchor, setExpenseMenuAnchor] = useState(null);
  const [trialMenuAnchor, setTrialMenuAnchor] = useState(null);

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

  const handleExpenseIndicatorClick = (e) => {
    e.stopPropagation();
    // Always show menu so user can select which expense to pay
    if (expenses && expenses.length > 0) {
      setExpenseMenuAnchor(e.currentTarget);
    }
  };

  const handleExpenseMenuClose = () => {
    setExpenseMenuAnchor(null);
  };

  const handleExpenseSelect = (expense) => {
    setExpenseMenuAnchor(null);
    if (onExpenseClick) onExpenseClick(expense);
  };

  // Handle trial lessons menu
  const handleTrialGroupClick = (e) => {
    e.stopPropagation();
    setTrialMenuAnchor(e.currentTarget);
  };

  const handleTrialMenuClose = () => {
    setTrialMenuAnchor(null);
  };

  const handleTrialSelect = (trial) => {
    setTrialMenuAnchor(null);
    if (onTrialLessonClick) onTrialLessonClick(trial);
  };

  // Combine and sort all events by time
  // If there are 2+ trial lessons, group them into one item
  const allEvents = [];
  const shouldGroupTrials = trialLessons && trialLessons.length >= 2;

  if (lessons) {
    lessons.forEach(lesson => {
      allEvents.push({
        ...lesson,
        type: 'lesson',
        sortTime: lesson.startTime
      });
    });
  }

  if (trialLessons && trialLessons.length > 0) {
    if (shouldGroupTrials) {
      // Group all trial lessons into one item
      // Sort trials by time to get the earliest time for sorting
      const sortedTrials = [...trialLessons].sort((a, b) =>
        (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
      );
      allEvents.push({
        type: 'trialGroup',
        trials: sortedTrials,
        count: trialLessons.length,
        sortTime: sortedTrials[0]?.scheduledTime || '00:00',
        pendingCount: trialLessons.filter(t => t.status === 'pending').length,
        completedCount: trialLessons.filter(t => t.status === 'completed').length,
      });
    } else {
      // Single trial lesson - show it normally
      trialLessons.forEach(trial => {
        allEvents.push({
          ...trial,
          type: 'trial',
          sortTime: trial.scheduledTime
        });
      });
    }
  }

  // Sort by time
  allEvents.sort((a, b) => (a.sortTime || '').localeCompare(b.sortTime || ''));

  const getTrialLessonColor = (status, trial) => {
    // Check if trial was postponed (has original date)
    if (trial?.originalScheduledDate && status === 'pending') {
      return '#9c27b0'; // Purple for rescheduled
    }
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

  const getLessonColor = (status, lesson) => {
    // Check if lesson was rescheduled (has original date) - show in purple
    if (lesson?.originalDate && status !== 'completed' && status !== 'cancelled') {
      return '#9c27b0'; // Purple for rescheduled
    }
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

  // Calculate total expense amount
  const totalExpenseAmount = expenses ? expenses.reduce((sum, e) => sum + (e.amount || e.estimatedAmount || 0), 0) : 0;
  const hasOverdueExpense = expenses?.some(e => e.status === 'overdue');

  // Calculate how many slots we have for events (no longer showing expense items separately)
  const maxVisibleEvents = 4;
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
        {/* Expense indicator - shows count and total */}
        {expenses && expenses.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              px: 0.5,
              py: 0.2,
              borderRadius: 1,
              bgcolor: hasOverdueExpense ? 'error.light' : 'warning.light',
              color: 'white',
              fontSize: '0.55rem',
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
            }}
            title={expenses.map(e => `${e.description || e.category}: ${e.amount?.toLocaleString('tr-TR')}₺`).join('\n') + '\n(Tıkla: Detay & Öde)'}
            onClick={handleExpenseIndicatorClick}
          >
            <PaymentIcon sx={{ fontSize: 10 }} />
            {expenses.length} - {totalExpenseAmount.toLocaleString('tr-TR')}₺
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, overflow: 'hidden' }}>
        {visibleEvents.map((event, index) => (
          event.type === 'trialGroup' ? (
            // Grouped Trial Lessons (2+)
            <Box
              key={`trial-group-${index}`}
              sx={{
                fontSize: '0.75rem',
                p: 0.75,
                borderRadius: 1,
                backgroundColor: '#ff9800',
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
              title={`${event.count} Deneme Dersi\n${event.trials.map(t => `${t.scheduledTime} - ${t.firstName} ${t.lastName}`).join('\n')}`}
              onClick={handleTrialGroupClick}
            >
              <Box sx={{ fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>&#9733;</span>
                {event.count} Deneme Dersi
              </Box>
              <Box sx={{ fontSize: '0.65rem', mt: 0.3, display: 'flex', gap: 0.5 }}>
                {event.pendingCount > 0 && <span>{event.pendingCount} bekliyor</span>}
                {event.completedCount > 0 && <span style={{ color: '#c8e6c9' }}>{event.completedCount} tamamlandı</span>}
              </Box>
            </Box>
          ) : event.type === 'trial' ? (
            // Single Trial Lesson
            <Box
              key={`trial-${event._id || index}`}
              sx={{
                fontSize: '0.75rem',
                p: 0.75,
                borderRadius: 1,
                backgroundColor: getTrialLessonColor(event.status, event),
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
              title={`DENEME: ${event.scheduledTime} - ${event.firstName} ${event.lastName} (${event.course?.name || 'Ders'})${event.originalScheduledDate ? ` [Ertelendi: ${new Date(event.originalScheduledDate).toLocaleDateString('tr-TR')} ${event.originalScheduledTime || ''}]` : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onTrialLessonClick) onTrialLessonClick(event);
              }}
            >
              <Box sx={{ fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>&#9733;</span> {/* Star icon for trial */}
                {event.scheduledTime}
                {event.originalScheduledDate && (
                  <span style={{ fontSize: '0.6rem', marginLeft: 4, opacity: 0.9 }}>↻</span>
                )}
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
                backgroundColor: getLessonColor(event.status, event),
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
              title={`${event.startTime}-${event.endTime} ${event.course?.name || 'Ders'}${event.notes ? ` - ${event.notes}` : ''}${event.originalDate ? ` [Ertelendi: ${new Date(event.originalDate).toLocaleDateString('tr-TR')} ${event.originalStartTime || ''}]` : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onLessonClick) onLessonClick(event);
              }}
            >
              <Box sx={{ fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {event.startTime}-{event.endTime}
                {event.originalDate && (
                  <span style={{ fontSize: '0.6rem', marginLeft: 4, opacity: 0.9 }}>↻</span>
                )}
              </Box>
              <Box sx={{ fontSize: '0.65rem', mt: 0.3 }}>
                {event.student
                  ? `${event.course?.name || 'Ders'} - ${event.student.firstName} ${event.student.lastName?.charAt(0) || ''}.`
                  : (event.notes ? `${event.course?.name || 'Ders'} - ${event.notes}` : (event.course?.name || 'Ders'))}
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

      {/* Expense selection menu for multiple expenses on same day */}
      <Menu
        anchorEl={expenseMenuAnchor}
        open={Boolean(expenseMenuAnchor)}
        onClose={handleExpenseMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {expenses && expenses.map((expense, index) => (
          <MenuItem
            key={expense._id || index}
            onClick={() => handleExpenseSelect(expense)}
          >
            <ListItemText
              primary={expense.description || expense.category}
              secondary={`${expense.amount?.toLocaleString('tr-TR')}₺ - ${new Date(expense.dueDate).toLocaleDateString('tr-TR')}`}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Trial lessons selection menu for grouped trial lessons */}
      <Menu
        anchorEl={trialMenuAnchor}
        open={Boolean(trialMenuAnchor)}
        onClose={handleTrialMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {trialLessons && trialLessons.map((trial, index) => (
          <MenuItem
            key={trial._id || index}
            onClick={() => handleTrialSelect(trial)}
            sx={{
              borderLeft: '3px solid',
              borderLeftColor: trial.status === 'completed' ? 'success.main' :
                              trial.status === 'cancelled' ? 'error.main' :
                              trial.status === 'converted' ? 'info.main' : 'warning.main',
            }}
          >
            <ListItemIcon>
              <StarIcon sx={{
                color: trial.status === 'completed' ? 'success.main' :
                       trial.status === 'cancelled' ? 'error.main' :
                       trial.status === 'converted' ? 'info.main' : 'warning.main',
                fontSize: 18
              }} />
            </ListItemIcon>
            <ListItemText
              primary={`${trial.firstName} ${trial.lastName}`}
              secondary={`${trial.scheduledTime} - ${trial.course?.name || 'Ders'}`}
            />
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};

export default CalendarDay;
