import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Alert,
  Avatar,
  Chip,
} from '@mui/material';
import { Search } from '@mui/icons-material';
import api from '../../api';
import { useApp } from '../../context/AppContext';

const BulkEnrollDialog = ({ open, onClose, course, onSuccess }) => {
  const { institution, season, user } = useApp();
  const [students, setStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && course) {
      loadStudents();
      loadEnrolledStudents();
    }
  }, [open, course]);

  const loadStudents = async () => {
    try {
      const response = await api.get('/students', {
        params: {
          institutionId: institution._id,
          seasonId: season._id,
        },
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Öğrenciler yüklenirken hata oluştu');
    }
  };

  const loadEnrolledStudents = async () => {
    try {
      const response = await api.get('/enrollments', {
        params: {
          courseId: course._id,
          seasonId: season._id,
        },
      });
      setEnrolledStudents(response.data.map(e => e.student._id));
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  };

  const handleToggle = (studentId) => {
    const currentIndex = selectedStudents.indexOf(studentId);
    const newSelected = [...selectedStudents];

    if (currentIndex === -1) {
      newSelected.push(studentId);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    const availableStudents = students
      .filter(s => !enrolledStudents.includes(s._id))
      .map(s => s._id);

    if (selectedStudents.length === availableStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(availableStudents);
    }
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      setError('Lütfen en az bir öğrenci seçin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/enrollments/bulk', {
        courseId: course._id,
        studentIds: selectedStudents,
        enrollmentDate: new Date(),
        institution: institution._id,
        season: season._id,
        createdBy: user?.username || 'System',
      });

      if (response.data.success) {
        onSuccess(response.data);
        handleClose();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Kayıt işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStudents([]);
    setSearchTerm('');
    setError('');
    onClose();
  };

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(search) ||
      student.lastName.toLowerCase().includes(search) ||
      student.studentId?.toLowerCase().includes(search)
    );
  });

  const availableStudents = filteredStudents.filter(
    s => !enrolledStudents.includes(s._id)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Derse Öğrenci Ekle
        <Typography variant="body2" color="text.secondary">
          {course?.name}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          placeholder="Öğrenci ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {selectedStudents.length} öğrenci seçildi
          </Typography>
          <Button size="small" onClick={handleSelectAll}>
            {selectedStudents.length === availableStudents.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
          </Button>
        </Box>

        {availableStudents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {searchTerm ? 'Öğrenci bulunamadı' : 'Tüm öğrenciler bu derse kayıtlı'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {availableStudents.map((student) => {
              const labelId = `checkbox-list-label-${student._id}`;
              const isChecked = selectedStudents.includes(student._id);

              return (
                <ListItem key={student._id} disablePadding>
                  <ListItemButton role={undefined} onClick={() => handleToggle(student._id)} dense>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isChecked}
                        tabIndex={-1}
                        disableRipple
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </ListItemIcon>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          {student.firstName} {student.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.studentId}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          student.status === 'active' ? 'Kayıtlı' :
                          student.status === 'passive' ? 'Pasif' : 'Deneme'
                        }
                        size="small"
                        color={
                          student.status === 'active' ? 'success' :
                          student.status === 'passive' ? 'default' : 'info'
                        }
                      />
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          İptal
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selectedStudents.length === 0}
        >
          {loading ? 'Kaydediliyor...' : `${selectedStudents.length} Öğrenci Ekle`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkEnrollDialog;
