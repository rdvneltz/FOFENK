import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const CalendarDay = ({ date, isCurrentMonth, isToday, lessons, onClick }) => {
  return (
    <Paper
      elevation={isToday ? 3 : 1}
      sx={{
        minHeight: 120,
        p: 1,
        cursor: 'pointer',
        backgroundColor: isCurrentMonth ? 'background.paper' : 'grey.100',
        border: isToday ? 2 : 0,
        borderColor: 'primary.main',
        '&:hover': {
          elevation: 3,
          backgroundColor: isCurrentMonth ? 'grey.50' : 'grey.200',
        },
      }}
      onClick={onClick}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: isToday ? 'bold' : 'normal',
          color: isCurrentMonth ? 'text.primary' : 'text.disabled',
          mb: 1,
        }}
      >
        {date.getDate()}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {lessons && lessons.slice(0, 3).map((lesson, index) => (
          <Box
            key={index}
            sx={{
              fontSize: '0.7rem',
              p: 0.5,
              borderRadius: 1,
              backgroundColor: 'primary.light',
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lesson.startTime}-{lesson.endTime} - {lesson.course?.name || 'Ders'}
          </Box>
        ))}
        {lessons && lessons.length > 3 && (
          <Typography variant="caption" color="text.secondary">
            +{lessons.length - 3} daha
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CalendarDay;
