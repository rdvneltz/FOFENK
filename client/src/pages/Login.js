import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, ArrowBack, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Two-step login states
  const [step, setStep] = useState(1);
  const [userInstitutions, setUserInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState(null);

  // Check if system needs setup
  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Add timeout to prevent hanging forever
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await api.get('/auth/check-setup', {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.data.needsSetup) {
          navigate('/setup');
        }
      } catch (error) {
        console.error('Setup check failed:', error);
        // If backend is unreachable or database is connecting, still allow user to try login
        // Show a warning if server is waking up (503 status)
        if (error.response?.status === 503) {
          setError('Server is starting up. Please wait a moment and try again.');
        }
        // The actual login attempt will show the real error
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      const { token, user, institutions } = response.data;

      // Check different scenarios
      if (user.role === 'superadmin') {
        // Superadmin - show institution selection if multiple institutions exist
        if (institutions && institutions.length > 1) {
          setTempToken(token);
          setTempUser(user);
          setUserInstitutions(institutions);
          setStep(2);
          setLoading(false);
        } else if (institutions && institutions.length === 1) {
          const userWithInstitution = {
            ...user,
            institution: institutions[0]
          };
          login(token, userWithInstitution);
          navigate('/');
        } else {
          // No institutions - still login (superadmin can manage this)
          login(token, user);
          navigate('/');
        }
      } else if (!institutions || institutions.length === 0) {
        // No institutions accessible
        setError('Hicbir kuruma erisim yetkiniz yok');
        setLoading(false);
      } else if (institutions.length === 1) {
        // Only one institution - direct login with that institution
        const userWithInstitution = {
          ...user,
          institution: institutions[0]
        };
        login(token, userWithInstitution);
        navigate('/');
      } else {
        // Multiple institutions - go to step 2 for selection
        setTempToken(token);
        setTempUser(user);
        setUserInstitutions(institutions);
        setStep(2);
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleInstitutionSelect = (e) => {
    setSelectedInstitutionId(e.target.value);
    setError('');
  };

  const handleInstitutionSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedInstitutionId) {
      setError('Lutfen bir kurum secin');
      return;
    }

    setLoading(true);

    try {
      // Find the selected institution object
      const selectedInstitution = userInstitutions.find(
        inst => inst._id === selectedInstitutionId
      );

      if (!selectedInstitution) {
        setError('Secilen kurum bulunamadi');
        setLoading(false);
        return;
      }

      // Add institution to user object
      const userWithInstitution = {
        ...tempUser,
        institution: selectedInstitution
      };

      // Complete login
      login(tempToken, userWithInstitution);
      navigate('/');
    } catch (err) {
      setError('Bir hata olustu. Lutfen tekrar deneyin.');
      setLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setSelectedInstitutionId('');
    setUserInstitutions([]);
    setTempToken('');
    setTempUser(null);
    setError('');
  };

  // Show loading while checking setup
  if (checkingSetup) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 450 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                FOFENK
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Theatre Management System
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {step === 1 ? 'Sign in to continue' : 'Select your institution'}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {step === 1 ? (
              // Step 1: Username and Password
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  margin="normal"
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  margin="normal"
                  autoComplete="current-password"
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={<LoginIcon />}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              // Step 2: Institution Selection
              <form onSubmit={handleInstitutionSubmit}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="institution-select-label">Kurum Secin</InputLabel>
                  <Select
                    labelId="institution-select-label"
                    id="institution-select"
                    value={selectedInstitutionId}
                    label="Kurum Secin"
                    onChange={handleInstitutionSelect}
                    disabled={loading}
                    autoFocus
                  >
                    {userInstitutions.map((institution) => (
                      <MenuItem key={institution._id} value={institution._id}>
                        {institution.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    onClick={handleBackToStep1}
                    disabled={loading}
                    startIcon={<ArrowBack />}
                  >
                    Geri
                  </Button>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    endIcon={<ArrowForward />}
                  >
                    {loading ? 'Devam ediliyor...' : 'Devam Et'}
                  </Button>
                </Box>
              </form>
            )}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                FOFENK - Theatre Management System v1.0
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;
