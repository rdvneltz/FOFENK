import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AppProvider, useApp } from './context/AppContext';
import theme from './theme';
import api from './api';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Auth Pages
import Login from './pages/Login';
import Setup from './pages/Setup';
import ResetDatabase from './pages/ResetDatabase';

// Pages
import Dashboard from './pages/Dashboard';
import Institutions from './pages/Institutions';
import InstitutionSetup from './pages/InstitutionSetup';
import SeasonManagement from './pages/SeasonManagement';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import StudentForm from './pages/StudentForm';
import Courses from './pages/Courses';
import Calendar from './pages/Calendar';
import Instructors from './pages/Instructors';
import Payments from './pages/Payments';
import PaymentPlan from './pages/PaymentPlan';
import Expenses from './pages/Expenses';
import CashRegisters from './pages/CashRegisters';
import TrialLessons from './pages/TrialLessons';
import PhoneBook from './pages/PhoneBook';
import MessageTemplates from './pages/MessageTemplates';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Users from './pages/Users';
import ActivityLogs from './pages/ActivityLogs';
import Backup from './pages/Backup';

const DRAWER_WIDTH = 260;

// PrivateRoute component
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useApp();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Setup check component
const SetupCheck = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await api.get('/auth/check-setup');
        if (response.data.needsSetup) {
          navigate('/setup');
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Setup check failed:', error);
        navigate('/login');
      } finally {
        setChecking(false);
      }
    };

    checkSetup();
  }, [navigate]);

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return null;
};

// Main layout wrapper
const MainLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Header handleDrawerToggle={handleDrawerToggle} />
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/reset-database" element={<ResetDatabase />} />
            <Route path="/check-setup" element={<SetupCheck />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/institutions" element={<Institutions />} />
                      <Route path="/institution-setup" element={<InstitutionSetup />} />
                      <Route path="/seasons" element={<SeasonManagement />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/students/new" element={<StudentForm />} />
                      <Route path="/students/:id" element={<StudentDetail />} />
                      <Route path="/students/:id/edit" element={<StudentForm />} />
                      <Route path="/courses" element={<Courses />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/instructors" element={<Instructors />} />
                      <Route path="/payments" element={<Payments />} />
                      <Route path="/payment-plan/:studentId" element={<PaymentPlan />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/cash-registers" element={<CashRegisters />} />
                      <Route path="/trial-lessons" element={<TrialLessons />} />
                      <Route path="/phone-book" element={<PhoneBook />} />
                      <Route path="/message-templates" element={<MessageTemplates />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/activity-logs" element={<ActivityLogs />} />
                      <Route path="/backup" element={<Backup />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </MainLayout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
