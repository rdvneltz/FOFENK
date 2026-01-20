import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tooltip,
  Chip,
} from '@mui/material';
import { Schedule, Person, School } from '@mui/icons-material';

// Configuration
const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 8; // 08:00
const END_HOUR = 22; // 22:00
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Parse time string (HH:MM) to minutes from midnight
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

// Get top position for a time
const getTimePosition = (timeStr) => {
  const minutes = parseTime(timeStr);
  const startMinutes = START_HOUR * 60;
  return ((minutes - startMinutes) / 60) * HOUR_HEIGHT;
};

// Get height for duration
const getDurationHeight = (durationMinutes) => {
  return (durationMinutes / 60) * HOUR_HEIGHT;
};

// Event colors based on type and status
const getEventStyle = (event, isTrialLesson) => {
  if (isTrialLesson) {
    // Check if trial was rescheduled
    if (event.originalScheduledDate && event.status === 'pending') {
      return { bgcolor: '#9c27b0', color: 'white', borderColor: '#7b1fa2' }; // Purple for rescheduled
    }
    switch (event.status) {
      case 'completed':
        return { bgcolor: '#4caf50', color: 'white', borderColor: '#388e3c' };
      case 'converted':
        return { bgcolor: '#9c27b0', color: 'white', borderColor: '#7b1fa2' };
      case 'cancelled':
        return { bgcolor: '#f44336', color: 'white', borderColor: '#d32f2f' };
      default: // pending
        return { bgcolor: '#ff9800', color: 'white', borderColor: '#f57c00' };
    }
  }
  // Check if regular lesson was rescheduled
  if (event.originalDate && event.status !== 'completed' && event.status !== 'cancelled') {
    return { bgcolor: '#9c27b0', color: 'white', borderColor: '#7b1fa2' }; // Purple for rescheduled
  }
  // Regular lesson - check status
  switch (event.status) {
    case 'completed':
      return { bgcolor: '#4caf50', color: 'white', borderColor: '#388e3c' };
    case 'cancelled':
      return { bgcolor: '#f44336', color: 'white', borderColor: '#d32f2f' };
    case 'postponed':
      return { bgcolor: '#ff9800', color: 'white', borderColor: '#f57c00' };
    default:
      return { bgcolor: '#2196f3', color: 'white', borderColor: '#1976d2' };
  }
};

// Group overlapping events
const groupOverlappingEvents = (events) => {
  if (!events.length) return [];

  // Sort by start time
  const sorted = [...events].sort((a, b) => {
    const aStart = parseTime(a.time || a.scheduledTime);
    const bStart = parseTime(b.time || b.scheduledTime);
    return aStart - bStart;
  });

  const groups = [];
  let currentGroup = [sorted[0]];
  let groupEnd = parseTime(sorted[0].time || sorted[0].scheduledTime) + (sorted[0].duration || 60);

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i];
    const eventStart = parseTime(event.time || event.scheduledTime);

    if (eventStart < groupEnd) {
      // Overlaps with current group
      currentGroup.push(event);
      groupEnd = Math.max(groupEnd, eventStart + (event.duration || 60));
    } else {
      // Start new group
      groups.push(currentGroup);
      currentGroup = [event];
      groupEnd = eventStart + (event.duration || 60);
    }
  }
  groups.push(currentGroup);

  return groups;
};

const DayScheduleView = ({
  date,
  lessons = [],
  trialLessons = [],
  onLessonClick,
  onTrialLessonClick,
  onTimeSlotClick,
  compact = false,
}) => {
  // Generate hour labels
  const hours = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  }, []);

  // Combine and process all events
  const allEvents = useMemo(() => {
    const lessonEvents = lessons.map(l => ({
      ...l,
      isTrialLesson: false,
      time: l.time || l.startTime,
      duration: l.duration || 60,
    }));

    const trialEvents = trialLessons.map(t => ({
      ...t,
      isTrialLesson: true,
      time: t.scheduledTime,
      duration: t.duration || 60,
    }));

    return [...lessonEvents, ...trialEvents];
  }, [lessons, trialLessons]);

  // Group overlapping events
  const eventGroups = useMemo(() => {
    return groupOverlappingEvents(allEvents);
  }, [allEvents]);

  // Render a single event block
  const renderEvent = (event, index, totalInGroup) => {
    const top = getTimePosition(event.time);
    const height = getDurationHeight(event.duration);
    const width = `${100 / totalInGroup}%`;
    const left = `${(index / totalInGroup) * 100}%`;
    const style = getEventStyle(event, event.isTrialLesson);

    const eventName = event.isTrialLesson
      ? `${event.firstName} ${event.lastName}`
      : (event.course?.name || event.name || 'Ders');

    const courseName = event.isTrialLesson
      ? event.course?.name
      : null;

    // For regular lessons, show notes/description if available
    const lessonDescription = !event.isTrialLesson && event.notes ? event.notes : null;

    return (
      <Tooltip
        key={event._id || `${event.time}-${index}`}
        title={
          <Box>
            <Typography variant="body2" fontWeight="bold">
              {eventName}
            </Typography>
            {courseName && (
              <Typography variant="caption" display="block">
                {courseName}
              </Typography>
            )}
            {lessonDescription && (
              <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                {lessonDescription}
              </Typography>
            )}
            <Typography variant="caption" display="block">
              {event.time} - {event.duration} dk
            </Typography>
            {event.isTrialLesson && (
              <Chip
                label={
                  event.originalScheduledDate && event.status === 'pending' ? 'Ertelendi ↻' :
                  event.status === 'pending' ? 'Bekliyor' :
                  event.status === 'completed' ? 'Tamamlandı' :
                  event.status === 'converted' ? 'Kayıt Oldu' : 'İptal'
                }
                size="small"
                sx={{ mt: 0.5 }}
              />
            )}
            {!event.isTrialLesson && event.originalDate && (
              <Typography variant="caption" display="block" color="warning.main">
                ↻ Ertelendi: {new Date(event.originalDate).toLocaleDateString('tr-TR')} {event.originalStartTime || ''}
              </Typography>
            )}
            {event.isTrialLesson && event.originalScheduledDate && (
              <Typography variant="caption" display="block" color="warning.main">
                ↻ Eski: {new Date(event.originalScheduledDate).toLocaleDateString('tr-TR')} {event.originalScheduledTime || ''}
              </Typography>
            )}
          </Box>
        }
        arrow
      >
        <Box
          onClick={() => event.isTrialLesson ? onTrialLessonClick?.(event) : onLessonClick?.(event)}
          sx={{
            position: 'absolute',
            top: `${top}px`,
            left,
            width,
            height: `${Math.max(height - 2, 20)}px`,
            bgcolor: style.bgcolor,
            color: style.color,
            borderLeft: `3px solid ${style.borderColor}`,
            borderRadius: '4px',
            padding: compact ? '2px 4px' : '4px 8px',
            overflow: 'hidden',
            cursor: 'pointer',
            fontSize: compact ? '10px' : '12px',
            boxShadow: 1,
            transition: 'transform 0.1s, box-shadow 0.1s',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: 3,
              zIndex: 10,
            },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 'bold',
              fontSize: 'inherit',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.isTrialLesson && '★ '}
            {(event.originalDate || event.originalScheduledDate) && '↻ '}
            {eventName}
          </Typography>
          {lessonDescription && !compact && height > 40 && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '9px',
                opacity: 0.9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontStyle: 'italic',
              }}
            >
              {lessonDescription}
            </Typography>
          )}
          {!compact && height > 30 && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '10px',
                opacity: 0.9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {event.time}
            </Typography>
          )}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: TOTAL_HOURS * HOUR_HEIGHT + 40 }}>
      {/* Time labels column */}
      <Box
        sx={{
          width: compact ? '40px' : '60px',
          flexShrink: 0,
          borderRight: '1px solid',
          borderColor: 'divider',
          position: 'relative',
        }}
      >
        {hours.map((hour) => (
          <Box
            key={hour}
            sx={{
              position: 'absolute',
              top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`,
              right: '8px',
              transform: 'translateY(-50%)',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: compact ? '10px' : '12px' }}
            >
              {String(hour).padStart(2, '0')}:00
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Events area */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          bgcolor: 'background.paper',
        }}
        onClick={(e) => {
          // Only trigger if clicking on the background, not an event
          if (e.target === e.currentTarget && onTimeSlotClick) {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const minutes = (y / HOUR_HEIGHT) * 60 + START_HOUR * 60;
            const hour = Math.floor(minutes / 60);
            const min = Math.round((minutes % 60) / 15) * 15; // Round to 15 min
            onTimeSlotClick(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
          }
        }}
      >
        {/* Hour grid lines */}
        {hours.map((hour) => (
          <Box
            key={hour}
            sx={{
              position: 'absolute',
              top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`,
              left: 0,
              right: 0,
              borderTop: '1px solid',
              borderColor: hour === START_HOUR ? 'transparent' : 'divider',
              height: `${HOUR_HEIGHT}px`,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          />
        ))}

        {/* Half-hour grid lines */}
        {hours.slice(0, -1).map((hour) => (
          <Box
            key={`${hour}-half`}
            sx={{
              position: 'absolute',
              top: `${(hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`,
              left: 0,
              right: 0,
              borderTop: '1px dashed',
              borderColor: 'divider',
              opacity: 0.5,
            }}
          />
        ))}

        {/* Render events */}
        {eventGroups.map((group) =>
          group.map((event, index) => renderEvent(event, index, group.length))
        )}

        {/* Current time indicator */}
        {(() => {
          const now = new Date();
          const today = new Date(date);
          if (
            now.getDate() === today.getDate() &&
            now.getMonth() === today.getMonth() &&
            now.getFullYear() === today.getFullYear()
          ) {
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            if (currentHour >= START_HOUR && currentHour < END_HOUR) {
              const top = ((currentHour - START_HOUR) * 60 + currentMin) / 60 * HOUR_HEIGHT;
              return (
                <Box
                  sx={{
                    position: 'absolute',
                    top: `${top}px`,
                    left: 0,
                    right: 0,
                    height: '2px',
                    bgcolor: 'error.main',
                    zIndex: 5,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '-4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                    },
                  }}
                />
              );
            }
          }
          return null;
        })()}
      </Box>
    </Box>
  );
};

export default DayScheduleView;
