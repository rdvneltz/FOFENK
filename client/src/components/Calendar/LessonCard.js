import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { AccessTime, Person, Group } from '@mui/icons-material';

const LessonCard = ({ lesson, onClick }) => {
  return (
    <Card
      elevation={2}
      sx={{
        cursor: 'pointer',
        '&:hover': {
          elevation: 4,
        },
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography variant="h6" component="div">
            {lesson.courseName}
          </Typography>
          <Chip
            label={lesson.status === 'completed' ? 'Tamamlandı' : 'Planlandı'}
            size="small"
            color={lesson.status === 'completed' ? 'success' : 'default'}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <AccessTime fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {lesson.startTime} - {lesson.endTime}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Person fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {lesson.instructorName}
          </Typography>
        </Box>

        {lesson.studentCount && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Group fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {lesson.studentCount} Öğrenci
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LessonCard;
