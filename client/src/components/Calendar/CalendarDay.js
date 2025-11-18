import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const CalendarDay = ({ date, isCurrentMonth, isToday, lessons, onClick }) => {
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
      onClick={onClick}
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
        {lessons && lessons.slice(0, 4).map((lesson, index) => (
          <Box
            key={index}
            sx={{
              fontSize: '0.75rem',
              p: 0.75,
              borderRadius: 1,
              backgroundColor: lesson.status === 'completed' ? 'success.light' :
                             lesson.status === 'cancelled' ? 'error.light' :
                             lesson.status === 'postponed' ? 'warning.light' : 'primary.light',
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 500,
              lineHeight: 1.3,
            }}
            title={`${lesson.startTime}-${lesson.endTime} ${lesson.course?.name || 'Ders'}`}
          >
            <Box sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
              {lesson.startTime}-{lesson.endTime}
            </Box>
            <Box sx={{ fontSize: '0.65rem', mt: 0.3 }}>
              {lesson.course?.name || 'Ders'}
            </Box>
          </Box>
        ))}
        {lessons && lessons.length > 4 && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
            +{lessons.length - 4} daha
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CalendarDay;
