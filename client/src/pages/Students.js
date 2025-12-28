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
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Fab,
  CircularProgress,
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
  MoreVert,
  PictureAsPdf,
  Warning,
  ErrorOutline,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkPdfLoading, setBulkPdfLoading] = useState(false);
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

  // Get phone number with fallback to parent
  const getDisplayPhone = (student) => {
    if (student.phone) {
      return { phone: student.phone, source: null };
    }
    // Check mother's phone
    const mother = student.parentContacts?.find(p => p.relationship === 'Anne');
    if (mother?.phone) {
      return { phone: mother.phone, source: 'Anne' };
    }
    // Check father's phone
    const father = student.parentContacts?.find(p => p.relationship === 'Baba');
    if (father?.phone) {
      return { phone: father.phone, source: 'Baba' };
    }
    return { phone: null, source: null };
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
      const [studentsRes, coursesRes, enrollmentsRes, paymentPlansRes] = await Promise.all([
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
        api.get('/payment-plans', {
          params: { institutionId: institution._id, seasonId: season._id },
        }),
      ]);
      setStudents(studentsRes.data);
      setCourses(coursesRes.data);
      setEnrollments(enrollmentsRes.data);
      setPaymentPlans(paymentPlansRes.data);
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

  // Helper function to get discount chip color based on percentage (light blue to dark blue)
  const getDiscountChipColor = (percentage) => {
    // 0% = light blue, 100% = dark blue
    const lightness = Math.max(35, 70 - (percentage * 0.35));
    return `hsl(210, 79%, ${lightness}%)`;
  };

  // Helper to get ALL discount badges (not just primary)
  const getDiscountBadges = (student) => {
    if (!student.discounts || student.discounts.length === 0) return null;

    return (
      <Box sx={{ display: 'inline-flex', gap: 0.5, ml: 1, flexWrap: 'wrap' }}>
        {student.discounts.map((discount, idx) => {
          if (discount.type === 'fullScholarship') {
            return (
              <Chip
                key={idx}
                icon={<School sx={{ fontSize: 14 }} />}
                label="Burslu"
                color="success"
                size="small"
                sx={{ height: 22 }}
              />
            );
          }

          // For percentage discounts, use color gradient
          const percentageValue = discount.percentageValue || discount.value;
          return (
            <Chip
              key={idx}
              icon={<LocalOffer sx={{ fontSize: 14, color: 'white' }} />}
              label={`%${percentageValue}`}
              size="small"
              sx={{
                height: 22,
                bgcolor: getDiscountChipColor(Number(percentageValue)),
                color: 'white',
                '& .MuiChip-label': { color: 'white' }
              }}
            />
          );
        })}
      </Box>
    );
  };

  // Check student status for issues (no enrollment, missing payment plans)
  const getStudentIssues = (studentId) => {
    const studentEnrollments = enrollments.filter(e =>
      (e.student?._id === studentId || e.student === studentId) && e.isActive
    );
    const studentPaymentPlans = paymentPlans.filter(p =>
      (p.student?._id === studentId || p.student === studentId) && p.status !== 'cancelled'
    );

    const issues = [];

    // No enrollment at all
    if (studentEnrollments.length === 0) {
      issues.push({ type: 'no_enrollment', message: 'Kursa kayıtlı değil' });
    } else {
      // Check if each enrollment has a payment plan
      const enrollmentCourseIds = studentEnrollments.map(e => e.course?._id || e.course);
      const planCourseIds = studentPaymentPlans.map(p => p.course?._id || p.course);

      const missingPlanCourses = studentEnrollments.filter(e => {
        const courseId = e.course?._id || e.course;
        return !planCourseIds.some(pId => String(pId) === String(courseId));
      });

      if (missingPlanCourses.length > 0) {
        const courseNames = missingPlanCourses.map(e => e.course?.name || 'Ders').join(', ');
        issues.push({
          type: 'missing_payment_plan',
          message: `Ödeme planı eksik: ${courseNames}`,
          count: missingPlanCourses.length
        });
      }
    }

    return issues;
  };

  // Get issue indicator for a student
  const getStudentIssueIndicator = (studentId) => {
    const issues = getStudentIssues(studentId);
    if (issues.length === 0) return null;

    const hasNoEnrollment = issues.some(i => i.type === 'no_enrollment');
    const hasMissingPaymentPlan = issues.some(i => i.type === 'missing_payment_plan');

    if (hasNoEnrollment) {
      return (
        <Tooltip title="Kursa kayıtlı değil">
          <ErrorOutline sx={{ fontSize: 18, color: 'error.main', ml: 0.5 }} />
        </Tooltip>
      );
    }

    if (hasMissingPaymentPlan) {
      const missingCount = issues.find(i => i.type === 'missing_payment_plan')?.count || 1;
      return (
        <Tooltip title={issues.find(i => i.type === 'missing_payment_plan')?.message}>
          <Warning sx={{ fontSize: 18, color: 'warning.main', ml: 0.5 }} />
        </Tooltip>
      );
    }

    return null;
  };

  // Handle bulk PDF download
  const handleBulkPdfDownload = async () => {
    try {
      setBulkPdfLoading(true);
      const response = await api.get('/pdf/bulk-student-report', {
        params: {
          institutionId: institution._id,
          seasonId: season._id
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Toplu_Ogrenci_Raporu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Bulk PDF error:', error);
      alert('Toplu rapor oluşturulurken bir hata oluştu');
    } finally {
      setBulkPdfLoading(false);
    }
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
    <Box sx={{ pb: { xs: 10, md: 2 } }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        mb: 2
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'}>Öğrenciler</Typography>
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedStudents.length > 0 && (
              <Button size="small" variant="outlined" startIcon={<Email />} onClick={handleSendEmail} color="info">
                Email ({selectedStudents.length})
              </Button>
            )}
            <Tooltip title={students.length > 30 ? `İlk 30 öğrenci dahil edilecek (Toplam: ${students.length})` : 'Tüm öğrencilerin raporunu indir'}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="secondary"
                  startIcon={bulkPdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
                  onClick={handleBulkPdfDownload}
                  disabled={bulkPdfLoading || students.length === 0}
                >
                  {bulkPdfLoading ? 'Hazırlanıyor...' : students.length > 30 ? `Toplu Rapor (30/${students.length})` : 'Toplu Rapor'}
                </Button>
              </span>
            </Tooltip>
            <Button size="small" variant="outlined" startIcon={<FileDownload />} onClick={handleExportToExcel}>
              Excel
            </Button>
            <Button size="small" variant="outlined" color="warning" onClick={() => navigate('/archived-students')}>
              Arşiv
            </Button>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/students/new')}>
              Yeni Öğrenci
            </Button>
          </Box>
        )}
      </Box>

      {/* Search & Filter */}
      <Paper sx={{ p: { xs: 1.5, md: 2 }, mb: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
          <TextField
            size={isMobile ? 'small' : 'medium'}
            fullWidth
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
            }}
          />
          <FormControl size={isMobile ? 'small' : 'medium'} sx={{ minWidth: { xs: '100%', sm: 180 } }}>
            <InputLabel>Ders</InputLabel>
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} label="Ders">
              <MenuItem value="">Tümü</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course._id} value={course._id}>{course.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Mobile Card View */}
      {isMobile ? (
        <Box>
          {filteredStudents.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {searchTerm ? 'Öğrenci bulunamadı' : 'Henüz öğrenci eklenmedi'}
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={1.5}>
              {filteredStudents.map((student) => {
                const studentCourses = getStudentCourses(student._id);
                return (
                  <Grid item xs={12} key={student._id}>
                    <Card sx={{ position: 'relative' }}>
                      <CardContent sx={{ pb: '12px !important', pt: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Avatar sx={{ width: 44, height: 44, fontSize: '1rem' }}>
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight="bold" noWrap>
                                {student.firstName} {student.lastName}
                              </Typography>
                              {getStudentIssueIndicator(student._id)}
                              {getDiscountBadges(student)}
                              {student.status === 'active' ? (
                                <Chip label="Kayıtlı" color="success" size="small" sx={{ height: 20 }} />
                              ) : student.status === 'trial' && (
                                <Chip label="Deneme" color="info" size="small" sx={{ height: 20 }} />
                              )}
                            </Box>
                            {studentCourses.length > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {studentCourses.join(', ')}
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                              {(() => {
                                const phoneInfo = getDisplayPhone(student);
                                return phoneInfo.phone ? (
                                  <Typography variant="body2" color="text.secondary">
                                    {phoneInfo.phone}
                                    {phoneInfo.source && (
                                      <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'info.main' }}>
                                        ({phoneInfo.source})
                                      </Typography>
                                    )}
                                  </Typography>
                                ) : null;
                              })()}
                              <Typography
                                variant="body2"
                                fontWeight="bold"
                                color={student.balance > 0 ? 'error.main' : 'success.main'}
                              >
                                {student.balance > 0 ? '-' : ''}₺{Math.abs(student.balance || 0).toLocaleString('tr-TR')}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => navigate(`/students/${student._id}`)} color="primary">
                              <Visibility fontSize="small" />
                            </IconButton>
                            {(() => {
                              const phoneInfo = getDisplayPhone(student);
                              return phoneInfo.phone ? (
                                <IconButton size="small" component="a" href={`tel:${phoneInfo.phone}`} color="success">
                                  <Phone fontSize="small" />
                                </IconButton>
                              ) : null;
                            })()}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
          {/* Floating Action Button for Mobile */}
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 72, right: 16 }}
            onClick={() => navigate('/students/new')}
          >
            <Add />
          </Fab>
        </Box>
      ) : (
        /* Desktop Table View */
        <TableContainer component={Paper}>
          <Table size={isTablet ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedStudents.length > 0 && selectedStudents.length < filteredStudents.filter((s) => s.email).length}
                    checked={filteredStudents.filter((s) => s.email).length > 0 && selectedStudents.length === filteredStudents.filter((s) => s.email).length}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, fontSize: '0.9rem' }}>
                            {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight="medium">
                                {student.firstName} {student.lastName}
                              </Typography>
                              {getStudentIssueIndicator(student._id)}
                              {getDiscountBadges(student)}
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
                      <TableCell>
                        {(() => {
                          const phoneInfo = getDisplayPhone(student);
                          return phoneInfo.phone ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {phoneInfo.phone}
                              {phoneInfo.source && (
                                <Chip label={phoneInfo.source} size="small" variant="outlined" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
                              )}
                            </Box>
                          ) : '-';
                        })()}
                      </TableCell>
                      <TableCell>{student.dateOfBirth ? calculateAge(student.dateOfBirth) : '-'}</TableCell>
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
                        <Typography variant="body2" color={student.balance > 0 ? 'error.main' : 'success.main'}>
                          {student.balance > 0 ? '-' : ''}₺{Math.abs(student.balance || 0).toLocaleString('tr-TR')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Bildirim Gönder">
                          <IconButton size="small" onClick={(e) => handleNotificationClick(e, student)} sx={{ color: '#25D366' }}>
                            <Send />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={() => navigate(`/students/${student._id}`)} color="primary">
                          <Visibility />
                        </IconButton>
                        <IconButton size="small" onClick={() => navigate(`/students/${student._id}/edit`)} color="info">
                          <Edit />
                        </IconButton>
                        {(() => {
                          const phoneInfo = getDisplayPhone(student);
                          return phoneInfo.phone ? (
                            <Tooltip title={phoneInfo.source ? `${phoneInfo.source} telefonu` : 'Ara'}>
                              <IconButton size="small" component="a" href={`tel:${phoneInfo.phone}`} color="success">
                                <Phone />
                              </IconButton>
                            </Tooltip>
                          ) : null;
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
        pageContext="students"
        studentId={notificationMenu.student?._id}
        studentData={notificationMenu.student}
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
