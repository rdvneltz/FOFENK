import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Avatar,
  Checkbox,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Visibility,
  Phone,
  FileDownload,
  Email,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SetupRequired from '../components/Common/SetupRequired';
import { exportStudents } from '../utils/exportHelpers';
import EmailDialog from '../components/Email/EmailDialog';

const Students = () => {
  const navigate = useNavigate();
  const { institution, season } = useApp();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    if (institution && season) {
      loadStudents();
    } else {
      setLoading(false);
    }
  }, [institution, season]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students', {
        params: {
          institutionId: institution._id,
          seasonId: season._id,
        },
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(search) ||
      student.lastName.toLowerCase().includes(search) ||
      student.phone?.includes(search) ||
      student.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <LoadingSpinner message="Öğrenciler yükleniyor..." />;
  }

  if (!institution) {
    return <SetupRequired type="institution" />;
  }

  if (!season) {
    return <SetupRequired type="season" />;
  }

  const handleExportToExcel = async () => {
    try {
      await exportStudents({
        institutionId: institution._id,
        seasonId: season._id,
      });
    } catch (error) {
      console.error('Error exporting students:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu.');
    }
  };

  const handleSelectStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const studentsWithEmail = filteredStudents.filter((s) => s.email);
      setSelectedStudents(studentsWithEmail.map((s) => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSendEmail = () => {
    const recipients = students
      .filter((s) => selectedStudents.includes(s._id))
      .map((s) => ({
        email: s.email,
        name: `${s.firstName} ${s.lastName}`,
      }));

    if (recipients.length === 0) {
      alert('Lütfen email gönderilecek öğrencileri seçin');
      return;
    }

    setEmailDialogOpen(true);
  };

  const handleEmailSuccess = () => {
    alert('Email başarıyla gönderildi!');
    setSelectedStudents([]);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Öğrenciler</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedStudents.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<Email />}
              onClick={handleSendEmail}
              color="info"
            >
              Email Gönder ({selectedStudents.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExportToExcel}
          >
            Excel'e Aktar
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => navigate('/archived-students')}
          >
            Arşiv
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/students/new')}
          >
            Yeni Öğrenci
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Öğrenci ara (ad, soyad, telefon, e-posta)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedStudents.length > 0 &&
                    selectedStudents.length < filteredStudents.filter((s) => s.email).length
                  }
                  checked={
                    filteredStudents.filter((s) => s.email).length > 0 &&
                    selectedStudents.length === filteredStudents.filter((s) => s.email).length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Öğrenci</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Yaş</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>Bakiye</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">
                    {searchTerm ? 'Öğrenci bulunamadı' : 'Henüz öğrenci eklenmedi'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student._id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => handleSelectStudent(student._id)}
                      disabled={!student.email}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>
                        {student.firstName.charAt(0)}
                        {student.lastName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">
                          {student.firstName} {student.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          TC: {student.tcNumber || '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{student.phone || '-'}</TableCell>
                  <TableCell>{student.email || '-'}</TableCell>
                  <TableCell>
                    {student.dateOfBirth
                      ? calculateAge(student.dateOfBirth)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {student.status === 'active' ? (
                      <Chip label="Kayıtlı" color="success" size="small" />
                    ) : student.status === 'passive' ? (
                      <Chip label="Pasif" color="default" size="small" />
                    ) : (
                      <Chip label="Deneme" color="info" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={student.balance > 0 ? 'error.main' : 'success.main'}
                    >
                      {student.balance > 0 ? '-' : ''}
                      ₺{Math.abs(student.balance || 0).toLocaleString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/students/${student._id}`)}
                      color="primary"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/students/${student._id}/edit`)}
                      color="info"
                    >
                      <Edit />
                    </IconButton>
                    {student.phone && (
                      <IconButton
                        size="small"
                        component="a"
                        href={`tel:${student.phone}`}
                        color="success"
                      >
                        <Phone />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EmailDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        recipients={students
          .filter((s) => selectedStudents.includes(s._id))
          .map((s) => ({
            email: s.email,
            name: `${s.firstName} ${s.lastName}`,
          }))}
        onSuccess={handleEmailSuccess}
      />
    </Box>
  );
};

export default Students;
