import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { Search, Phone, Email, Send } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmailDialog from '../components/Email/EmailDialog';
import NotificationMenu from '../components/Common/NotificationMenu';

const PhoneBook = () => {
  const { institution, season } = useApp();
  const [contacts, setContacts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  // Notification menu state
  const [notificationMenu, setNotificationMenu] = useState({ anchorEl: null, contact: null });
  const [singleEmailDialog, setSingleEmailDialog] = useState({ open: false, recipients: [], subject: '', message: '', templateData: {} });

  useEffect(() => {
    if (institution && season) {
      loadContacts();
    }
  }, [institution, season]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // Load students, instructors, courses, and enrollments
      const [studentsRes, instructorsRes, coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/students', {
          params: {
            institutionId: institution._id,
            seasonId: season._id,
          },
        }),
        api.get('/instructors', {
          params: {
            institutionId: institution._id,
            seasonId: season._id
          },
        }),
        api.get('/courses', {
          params: { institution: institution._id, season: season._id },
        }),
        api.get('/enrollments', {
          params: { seasonId: season._id, isActive: true },
        }),
      ]);

      setCourses(coursesRes.data);

      // Create a map of student -> courses
      const studentCourses = {};
      enrollmentsRes.data.forEach(e => {
        const studentId = e.student?._id || e.student;
        if (!studentCourses[studentId]) studentCourses[studentId] = [];
        if (e.course?.name) studentCourses[studentId].push({ id: e.course._id, name: e.course.name });
      });

      const allContacts = [
        ...studentsRes.data.map((s) => ({
          ...s,
          type: 'student',
          displayName: `${s.firstName} ${s.lastName}`,
          courses: studentCourses[s._id] || [],
        })),
        ...instructorsRes.data.map((i) => ({
          ...i,
          type: 'instructor',
          displayName: i.name || `${i.firstName || ''} ${i.lastName || ''}`.trim(),
          courses: [], // Instructors don't have course enrollments in the same way
        })),
      ];

      // Add parent contacts from parentContacts array
      studentsRes.data.forEach((student) => {
        // Add from new parentContacts array
        if (student.parentContacts && student.parentContacts.length > 0) {
          student.parentContacts.forEach((parent, idx) => {
            if (parent.phone) {
              allContacts.push({
                _id: `parent-${student._id}-${idx}`,
                displayName: parent.name || parent.relationship,
                phone: parent.phone,
                email: parent.email || '',
                type: 'parent',
                relationship: parent.relationship,
                studentName: `${student.firstName} ${student.lastName}`,
                studentId: student._id,
                courses: studentCourses[student._id] || [],
              });
            }
          });
        }
        // Also add from legacy parentName/parentPhone if exists and different
        if (student.parentName && student.parentPhone) {
          const alreadyExists = allContacts.some(c =>
            c.type === 'parent' &&
            c.studentId === student._id &&
            c.phone === student.parentPhone
          );
          if (!alreadyExists) {
            allContacts.push({
              _id: `parent-legacy-${student._id}`,
              displayName: student.parentName,
              phone: student.parentPhone,
              email: student.parentEmail || '',
              type: 'parent',
              relationship: 'Veli',
              studentName: `${student.firstName} ${student.lastName}`,
              studentId: student._id,
              courses: studentCourses[student._id] || [],
            });
          }
        }
      });

      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      contact.displayName?.toLowerCase().includes(search) ||
      contact.phone?.includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.studentName?.toLowerCase().includes(search);

    // Type filter
    if (typeFilter && contact.type !== typeFilter) {
      return false;
    }

    // Course filter
    if (courseFilter) {
      const hasCourse = contact.courses?.some(c => c.id === courseFilter);
      if (!hasCourse) return false;
    }

    return matchesSearch;
  });

  // Notification menu handlers
  const handleNotificationClick = (event, contact) => {
    setNotificationMenu({ anchorEl: event.currentTarget, contact });
  };

  const handleNotificationClose = () => {
    setNotificationMenu({ anchorEl: null, contact: null });
  };

  const handleEmailFromNotification = (recipients, subject, message, templateData) => {
    setSingleEmailDialog({ open: true, recipients, subject, message, templateData });
    handleNotificationClose();
  };

  const handleSelectContact = (contactId) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const contactsWithEmail = filteredContacts.filter((c) => c.email);
      setSelectedContacts(contactsWithEmail.map((c) => c._id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSendBulkEmail = () => {
    const recipients = contacts
      .filter((c) => selectedContacts.includes(c._id))
      .map((c) => ({
        email: c.email,
        name: c.displayName,
      }));

    if (recipients.length === 0) {
      alert('Lütfen email gönderilecek kişileri seçin');
      return;
    }

    setEmailDialogOpen(true);
  };

  const handleEmailSuccess = () => {
    alert('Email başarıyla gönderildi!');
    setSelectedContacts([]);
  };

  if (loading) {
    return <LoadingSpinner message="Rehber yükleniyor..." />;
  }

  if (!institution || !season) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum ve sezon seçin
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Telefon Rehberi</Typography>
        {selectedContacts.length > 0 && (
          <Button
            variant="contained"
            startIcon={<Send />}
            onClick={handleSendBulkEmail}
            color="primary"
          >
            Toplu Email Gönder ({selectedContacts.length})
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            sx={{ flex: 1, minWidth: 200 }}
            placeholder="İsim, telefon veya e-posta ile ara..."
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
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Tip</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Tip"
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="student">Öğrenci</MenuItem>
              <MenuItem value="parent">Veli</MenuItem>
              <MenuItem value="instructor">Eğitmen</MenuItem>
            </Select>
          </FormControl>
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
                    selectedContacts.length > 0 &&
                    selectedContacts.length < filteredContacts.filter((c) => c.email).length
                  }
                  checked={
                    filteredContacts.filter((c) => c.email).length > 0 &&
                    selectedContacts.length === filteredContacts.filter((c) => c.email).length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>İsim</TableCell>
              <TableCell>Dersler</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Tip</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    {searchTerm || courseFilter || typeFilter ? 'Kişi bulunamadı' : 'Rehberde kişi yok'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact._id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedContacts.includes(contact._id)}
                      onChange={() => handleSelectContact(contact._id)}
                      disabled={!contact.email}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar>{contact.displayName?.charAt(0) || '?'}</Avatar>
                      <Box>
                        <Typography variant="body1">{contact.displayName}</Typography>
                        {contact.type === 'parent' && (
                          <Typography variant="caption" color="text.secondary">
                            {contact.relationship || 'Veli'} ({contact.studentName})
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {contact.courses && contact.courses.length > 0 ? (
                        contact.courses.map((course, idx) => (
                          <Chip key={idx} label={course.name} size="small" variant="outlined" />
                        ))
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        contact.type === 'student'
                          ? 'Öğrenci'
                          : contact.type === 'instructor'
                          ? 'Eğitmen'
                          : contact.relationship || 'Veli'
                      }
                      size="small"
                      color={
                        contact.type === 'student'
                          ? 'primary'
                          : contact.type === 'instructor'
                          ? 'secondary'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    {(contact.phone || contact.email) && (
                      <Tooltip title="Bildirim Gönder">
                        <IconButton
                          size="small"
                          onClick={(e) => handleNotificationClick(e, contact)}
                          sx={{ color: '#25D366' }}
                        >
                          <Send />
                        </IconButton>
                      </Tooltip>
                    )}
                    {contact.phone && (
                      <IconButton
                        size="small"
                        component="a"
                        href={`tel:${contact.phone}`}
                        color="primary"
                      >
                        <Phone />
                      </IconButton>
                    )}
                    {contact.email && (
                      <IconButton
                        size="small"
                        component="a"
                        href={`mailto:${contact.email}`}
                        color="info"
                      >
                        <Email />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bulk Email Dialog */}
      <EmailDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        recipients={contacts
          .filter((c) => selectedContacts.includes(c._id))
          .map((c) => ({
            email: c.email,
            name: c.displayName,
          }))}
        onSuccess={handleEmailSuccess}
      />

      {/* Notification Menu */}
      <NotificationMenu
        anchorEl={notificationMenu.anchorEl}
        open={Boolean(notificationMenu.anchorEl)}
        onClose={handleNotificationClose}
        recipientData={notificationMenu.contact ? {
          name: notificationMenu.contact.displayName,
          phone: notificationMenu.contact.phone,
          email: notificationMenu.contact.email,
        } : {}}
        templateData={notificationMenu.contact ? {
          recipientName: notificationMenu.contact.displayName,
          studentName: notificationMenu.contact.type === 'parent'
            ? notificationMenu.contact.studentName
            : notificationMenu.contact.displayName,
          courseName: notificationMenu.contact.courses?.map(c => c.name).join(', ') || '',
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

export default PhoneBook;
