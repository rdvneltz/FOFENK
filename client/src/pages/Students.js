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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Visibility,
  Phone,
  FileDownload,
  Email,
  School,
  LocalOffer,
  WhatsApp,
  Send,
} from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SetupRequired from '../components/Common/SetupRequired';
import { exportStudents } from '../utils/exportHelpers';
import EmailDialog from '../components/Email/EmailDialog';
import NotificationMenu from '../components/Common/NotificationMenu';

const Students = () => {
  const navigate = useNavigate();
  const { institution, season } = useApp();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Notification menu state
  const [notificationMenu, setNotificationMenu] = useState({
    anchorEl: null,
    student: null,
  });
  // Single email dialog for notification
  const [singleEmailDialog, setSingleEmailDialog] = useState({
    open: false,
    recipients: [],
    subject: '',
    message: '',
    templateData: {},
  });

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
      loadData();
    } else {
      setLoading(false);
    }
  }, [institution, season]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/students', {
          params: {
            institutionId: institution._id,
            seasonId: season._id,
            includeDiscountInfo: 'true',
          },
        }),
        api.get('/courses', {
          params: { institution: institution._id, season: season._id },
        }),
        api.get('/enrollments', {
          params: { seasonId: season._id, isActive: true },
        }),
      ]);
      setStudents(studentsRes.data);
      setCourses(coursesRes.data);
      setEnrollments(enrollmentsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get enrolled courses for a student
  const getStudentCourses = (studentId) => {
    const studentEnrollments = enrollments.filter(e => e.student?._id === studentId || e.student === studentId);
    return studentEnrollments.map(e => e.course?.name || '').filter(Boolean);
  };

  // Helper to get discount badge
  const getDiscountBadge = (student) => {
    if (!student.primaryDiscount) return null;

    const discount = student.primaryDiscount;

    if (discount.type === 'fullScholarship') {
      return (
        <Chip
          icon={<School />}
          label="Burslu"
          color="success"
          size="small"
          sx={{ ml: 1 }}
        />
      );
    }

    if (discount.type === 'percentage') {
      return (
        <Chip
          icon={<LocalOffer />}
          label={`%${discount.value}`}
          color="info"
          size="small"
          sx={{ ml: 1 }}
        />
      );
    }

    if (discount.type === 'fixed') {
      return (
        <Chip
          icon={<LocalOffer />}
          label={`₺${discount.value}`}
          color="info"
          size="small"
          sx={{ ml: 1 }}
        />
      );
    }

    return null;
  };

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      student.firstName.toLowerCase().includes(search) ||
      student.lastName.toLowerCase().includes(search) ||
      student.phone?.includes(search) ||
      student.email?.toLowerCase().includes(search);

    // Course filter
    if (courseFilter) {
      const studentEnrollments = enrollments.filter(e => e.student?._id === student._id || e.student === student._id);
      const hasCourse = studentEnrollments.some(e => e.course?._id === courseFilter);
      return matchesSearch && hasCourse;
    }

    return matchesSearch;
  });

  // Notification menu handlers
  const handleNotificationClick = (event, student) => {
    setNotificationMenu({ anchorEl: event.currentTarget, student });
  };

  const handleNotificationClose = () => {
    setNotificationMenu({ anchorEl: null, student: null });
  };

  const handleEmailFromNotification = (recipients, subject, message, templateData) => {
    setSingleEmailDialog({
      open: true,
      recipients,
      subject,
      message,
      templateData,
    });
    handleNotificationClose();
  };

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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            sx={{ flex: 1 }}
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Ders Filtrele</InputLabel>
            <Select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              label="Ders Filtrele"
            >
              <MenuItem value="">Tümü</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>
                  {course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
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
              <TableCell>Dersler</TableCell>
              <TableCell>Telefon</TableCell>
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
              filteredStudents.map((student) => {
                const studentCourses = getStudentCourses(student._id);
                return (
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
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body1">
                              {student.firstName} {student.lastName}
                            </Typography>
                            {getDiscountBadge(student)}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            TC: {student.tcNo || '-'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {studentCourses.length > 0 ? (
                          studentCourses.map((courseName, idx) => (
                            <Chip key={idx} label={courseName} size="small" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
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
                      <Tooltip title="Bildirim Gönder">
                        <IconButton
                          size="small"
                          onClick={(e) => handleNotificationClick(e, student)}
                          sx={{ color: '#25D366' }}
                        >
                          <Send />
                        </IconButton>
                      </Tooltip>
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
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Email Dialog */}
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

      {/* Notification Menu */}
      <NotificationMenu
        anchorEl={notificationMenu.anchorEl}
        open={Boolean(notificationMenu.anchorEl)}
        onClose={handleNotificationClose}
        recipientData={notificationMenu.student ? {
          name: `${notificationMenu.student.firstName} ${notificationMenu.student.lastName}`,
          phone: notificationMenu.student.phone,
          email: notificationMenu.student.email,
        } : {}}
        templateData={notificationMenu.student ? {
          studentName: `${notificationMenu.student.firstName} ${notificationMenu.student.lastName}`,
          recipientName: `${notificationMenu.student.firstName} ${notificationMenu.student.lastName}`,
          courseName: getStudentCourses(notificationMenu.student._id).join(', '),
        } : {}}
        onEmailClick={handleEmailFromNotification}
      />

      {/* Single Email Dialog (from notification) */}
      <EmailDialog
        open={singleEmailDialog.open}
        onClose={() => setSingleEmailDialog({ open: false, recipients: [], subject: '', message: '', templateData: {} })}
        recipients={singleEmailDialog.recipients}
        defaultSubject={singleEmailDialog.subject}
        defaultMessage={singleEmailDialog.message}
        templateData={singleEmailDialog.templateData}
        onSuccess={() => {
          alert('Email başarıyla gönderildi!');
          setSingleEmailDialog({ open: false, recipients: [], subject: '', message: '', templateData: {} });
        }}
      />
    </Box>
  );
};

export default Students;
