import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  IconButton,
  Alert,
  Switch,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add, Edit, Delete, ToggleOn, ToggleOff, ContentCopy } from '@mui/icons-material';
import { useApp } from '../context/AppContext';
import api from '../api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ConfirmDialog from '../components/Common/ConfirmDialog';

const SeasonManagement = () => {
  const { institution, seasons, refreshSeasons } = useApp();
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openCopyDialog, setOpenCopyDialog] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [error, setError] = useState('');
  const [copyFormData, setCopyFormData] = useState({
    sourceSeasonId: '',
    dataTypes: [],
  });
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
  });

  const handleOpenDialog = (season = null) => {
    if (season) {
      setSelectedSeason(season);
      setFormData({
        name: season.name,
        startDate: season.startDate.split('T')[0],
        endDate: season.endDate.split('T')[0],
        isActive: season.isActive,
      });
    } else {
      setSelectedSeason(null);
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        isActive: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSeason(null);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const seasonData = {
        ...formData,
        institution: institution._id,
      };

      if (selectedSeason) {
        await api.put(`/seasons/${selectedSeason._id}`, seasonData);
      } else {
        await api.post('/seasons', seasonData);
      }

      await refreshSeasons();
      handleCloseDialog();
    } catch (error) {
      setError(error.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/seasons/${selectedSeason._id}`);
      await refreshSeasons();
      setOpenConfirm(false);
      setSelectedSeason(null);
    } catch (error) {
      setError(error.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  const handleToggleActive = async (season) => {
    try {
      setLoading(true);
      await api.put(`/seasons/${season._id}/toggle-active`);
      await refreshSeasons();
    } catch (error) {
      setError(error.response?.data?.message || 'Durum değiştirme başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCopyDialog = (season) => {
    setSelectedSeason(season);
    setCopyFormData({
      sourceSeasonId: '',
      dataTypes: [],
    });
    setOpenCopyDialog(true);
  };

  const handleCloseCopyDialog = () => {
    setOpenCopyDialog(false);
    setSelectedSeason(null);
    setError('');
  };

  const handleCopyDataTypeToggle = (dataType) => {
    setCopyFormData((prev) => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(dataType)
        ? prev.dataTypes.filter((t) => t !== dataType)
        : [...prev.dataTypes, dataType],
    }));
  };

  const handleCopyData = async () => {
    if (!copyFormData.sourceSeasonId) {
      setError('Lütfen kaynak sezon seçin');
      return;
    }
    if (copyFormData.dataTypes.length === 0) {
      setError('Lütfen en az bir veri tipi seçin');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/seasons/${selectedSeason._id}/copy-data`, {
        sourceSeasonId: copyFormData.sourceSeasonId,
        dataTypes: copyFormData.dataTypes,
        institution: institution._id,
      });

      if (response.data.success) {
        const resultMessages = [];
        if (response.data.results.students) {
          resultMessages.push(`${response.data.results.students} öğrenci`);
        }
        if (response.data.results.courses) {
          resultMessages.push(`${response.data.results.courses} ders`);
        }
        if (response.data.results.messageTemplates) {
          resultMessages.push(`${response.data.results.messageTemplates} mesaj şablonu`);
        }

        alert(`Başarıyla kopyalandı: ${resultMessages.join(', ')}`);
        handleCloseCopyDialog();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Veri kopyalama başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (!institution) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="text.secondary">
          Lütfen bir kurum seçin
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Sezon Yönetimi</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Sezon
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sezon Adı</TableCell>
              <TableCell>Başlangıç Tarihi</TableCell>
              <TableCell>Bitiş Tarihi</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {seasons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">Henüz sezon eklenmedi</Typography>
                </TableCell>
              </TableRow>
            ) : (
              seasons.map((season) => (
                <TableRow key={season._id}>
                  <TableCell>{season.name}</TableCell>
                  <TableCell>
                    {new Date(season.startDate).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    {new Date(season.endDate).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {season.isActive ? (
                        <Chip label="Aktif" color="success" size="small" />
                      ) : (
                        <Chip label="Pasif" size="small" />
                      )}
                      <Tooltip title={season.isActive ? 'Pasif Yap' : 'Aktif Yap'}>
                        <Switch
                          checked={season.isActive}
                          onChange={() => handleToggleActive(season)}
                          size="small"
                          color="success"
                        />
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Veri Kopyala">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenCopyDialog(season)}
                        color="info"
                      >
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(season)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedSeason(season);
                        setOpenConfirm(true);
                      }}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Season Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedSeason ? 'Sezon Düzenle' : 'Yeni Sezon'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Sezon Adı"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Başlangıç Tarihi"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Bitiş Tarihi"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>İptal</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleDelete}
        title="Sezon Sil"
        message="Bu sezonu silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        confirmColor="error"
      />

      {/* Copy Data Dialog */}
      <Dialog open={openCopyDialog} onClose={handleCloseCopyDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Sezona Veri Kopyala</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Hedef Sezon: <strong>{selectedSeason?.name}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Kaynak Sezon</InputLabel>
                <Select
                  value={copyFormData.sourceSeasonId}
                  onChange={(e) =>
                    setCopyFormData((prev) => ({ ...prev, sourceSeasonId: e.target.value }))
                  }
                  label="Kaynak Sezon"
                >
                  {seasons
                    .filter((s) => s._id !== selectedSeason?._id)
                    .map((season) => (
                      <MenuItem key={season._id} value={season._id}>
                        {season.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Kopyalanacak Veriler
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={copyFormData.dataTypes.includes('students')}
                      onChange={() => handleCopyDataTypeToggle('students')}
                    />
                  }
                  label="Öğrenciler (bakiyeler sıfırlanır)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={copyFormData.dataTypes.includes('courses')}
                      onChange={() => handleCopyDataTypeToggle('courses')}
                    />
                  }
                  label="Dersler"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={copyFormData.dataTypes.includes('messageTemplates')}
                      onChange={() => handleCopyDataTypeToggle('messageTemplates')}
                    />
                  }
                  label="Mesaj Şablonları"
                />
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                Seçilen veriler kaynak sezondan hedef sezona kopyalanacaktır. Eğitmenler sezonlar
                arası paylaşıldığı için kopyalanmaz.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCopyDialog}>İptal</Button>
          <Button onClick={handleCopyData} variant="contained" disabled={loading}>
            {loading ? 'Kopyalanıyor...' : 'Kopyala'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeasonManagement;
