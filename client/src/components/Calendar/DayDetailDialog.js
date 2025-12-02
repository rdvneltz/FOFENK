import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Close,
  Add,
  School,
  PersonAdd,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import DayScheduleView from './DayScheduleView';
import CreateTrialLessonDialog from './CreateTrialLessonDialog';
import TrialLessonDetailDialog from './TrialLessonDetailDialog';

const DayDetailDialog = ({
  open,
  onClose,
  date,
  lessons = [],
  trialLessons = [],
  onDateChange,
  onUpdated,
}) => {
  const [createTrialLessonOpen, setCreateTrialLessonOpen] = useState(false);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState(null);
  const [trialLessonDetailOpen, setTrialLessonDetailOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrevDay = () => {
    if (date && onDateChange) {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() - 1);
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    if (date && onDateChange) {
      const newDate = new Date(date);
      newDate.setDate(newDate.getDate() + 1);
      onDateChange(newDate);
    }
  };

  const handleTimeSlotClick = (time) => {
    setSelectedTime(time);
    setAddMenuAnchor(null);
    setCreateTrialLessonOpen(true);
  };

  const handleAddClick = (event) => {
    setAddMenuAnchor(event.currentTarget);
  };

  const handleAddMenuClose = () => {
    setAddMenuAnchor(null);
  };

  const handleAddTrialLesson = () => {
    setSelectedTime(null);
    setAddMenuAnchor(null);
    setCreateTrialLessonOpen(true);
  };

  const handleTrialLessonClick = (trialLesson) => {
    setSelectedTrialLesson(trialLesson);
    setTrialLessonDetailOpen(true);
  };

  const handleLessonClick = (lesson) => {
    // For now, just show an alert - can be expanded later
    console.log('Lesson clicked:', lesson);
  };

  const handleTrialLessonCreated = () => {
    setCreateTrialLessonOpen(false);
    if (onUpdated) onUpdated();
  };

  const handleTrialLessonUpdated = () => {
    setTrialLessonDetailOpen(false);
    setSelectedTrialLesson(null);
    if (onUpdated) onUpdated();
  };

  // Stats for the day
  const lessonCount = lessons.length;
  const trialLessonCount = trialLessons.length;
  const pendingTrials = trialLessons.filter(t => t.status === 'pending').length;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '85vh', maxHeight: '800px' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={handlePrevDay} size="small">
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: '280px', textAlign: 'center' }}>
                {formatDate(date)}
              </Typography>
              <IconButton onClick={handleNextDay} size="small">
                <ChevronRight />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                onClick={handleAddClick}
                color="warning"
              >
                Ekle
              </Button>
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Day stats */}
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {lessonCount > 0 && (
              <Chip
                icon={<School sx={{ fontSize: 16 }} />}
                label={`${lessonCount} Ders`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {trialLessonCount > 0 && (
              <Chip
                icon={<PersonAdd sx={{ fontSize: 16 }} />}
                label={`${trialLessonCount} Deneme Dersi`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            {pendingTrials > 0 && (
              <Chip
                label={`${pendingTrials} Bekliyor`}
                size="small"
                sx={{ bgcolor: 'warning.light', color: 'white' }}
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, overflow: 'auto' }}>
          <DayScheduleView
            date={date}
            lessons={lessons}
            trialLessons={trialLessons}
            onLessonClick={handleLessonClick}
            onTrialLessonClick={handleTrialLessonClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        </DialogContent>

        <DialogActions>
          {/* Legend */}
          <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center', px: 1 }}>
            <Typography variant="caption" color="text.secondary">Renk Açıklaması:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label="Ders" sx={{ bgcolor: '#2196f3', color: 'white', height: 20, fontSize: 10 }} />
              <Chip size="small" label="Deneme (Bekliyor)" sx={{ bgcolor: '#ff9800', color: 'white', height: 20, fontSize: 10 }} />
              <Chip size="small" label="Tamamlandı" sx={{ bgcolor: '#4caf50', color: 'white', height: 20, fontSize: 10 }} />
              <Chip size="small" label="Kayıt Oldu" sx={{ bgcolor: '#9c27b0', color: 'white', height: 20, fontSize: 10 }} />
            </Box>
          </Box>
          <Button onClick={onClose}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Add Menu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={Boolean(addMenuAnchor)}
        onClose={handleAddMenuClose}
      >
        <MenuItem onClick={handleAddTrialLesson}>
          <ListItemIcon>
            <PersonAdd fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Yeni Deneme Dersi</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Trial Lesson Dialog */}
      <CreateTrialLessonDialog
        open={createTrialLessonOpen}
        onClose={() => setCreateTrialLessonOpen(false)}
        selectedDate={date}
        onSuccess={handleTrialLessonCreated}
      />

      {/* Trial Lesson Detail Dialog */}
      {selectedTrialLesson && (
        <TrialLessonDetailDialog
          open={trialLessonDetailOpen}
          onClose={() => {
            setTrialLessonDetailOpen(false);
            setSelectedTrialLesson(null);
          }}
          trialLesson={selectedTrialLesson}
          onUpdated={handleTrialLessonUpdated}
          onDeleted={handleTrialLessonUpdated}
        />
      )}
    </>
  );
};

export default DayDetailDialog;
