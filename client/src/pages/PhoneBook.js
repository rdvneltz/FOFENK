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
} from '@mui/material';
import { Search, Phone, Email, WhatsApp, Send } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmailDialog from '../components/Email/EmailDialog';

const PhoneBook = () => {
  const { institution, season } = useApp();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  useEffect(() => {
    if (institution && season) {
      loadContacts();
    }
  }, [institution, season]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // Load students, instructors, and parents
      const [studentsRes, instructorsRes] = await Promise.all([
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
      ]);

      const allContacts = [
        ...studentsRes.data.map((s) => ({
          ...s,
          type: 'student',
          displayName: `${s.firstName} ${s.lastName}`,
        })),
        ...instructorsRes.data.map((i) => ({
          ...i,
          type: 'instructor',
          displayName: i.name,
        })),
      ];

      // Add parent contacts
      studentsRes.data.forEach((student) => {
        if (student.parentName && student.parentPhone) {
          allContacts.push({
            _id: `parent-${student._id}`,
            displayName: student.parentName,
            phone: student.parentPhone,
            email: student.parentEmail,
            type: 'parent',
            studentName: `${student.firstName} ${student.lastName}`,
          });
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
    return (
      contact.displayName?.toLowerCase().includes(search) ||
      contact.phone?.includes(search) ||
      contact.email?.toLowerCase().includes(search)
    );
  });

  const handleWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
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
        <TextField
          fullWidth
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
              <TableCell>Telefon</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Tip</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">
                    {searchTerm ? 'Kişi bulunamadı' : 'Rehberde kişi yok'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact._id}>
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
                            Veli ({contact.studentName})
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{contact.phone || '-'}</TableCell>
                  <TableCell>{contact.email || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        contact.type === 'student'
                          ? 'Öğrenci'
                          : contact.type === 'instructor'
                          ? 'Eğitmen'
                          : 'Veli'
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
                    {contact.phone && (
                      <>
                        <IconButton
                          size="small"
                          component="a"
                          href={`tel:${contact.phone}`}
                          color="primary"
                        >
                          <Phone />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleWhatsApp(contact.phone)}
                          sx={{ color: '#25D366' }}
                        >
                          <WhatsApp />
                        </IconButton>
                      </>
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
    </Box>
  );
};

export default PhoneBook;
