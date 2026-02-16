import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AppProvider, useApp } from './context/AppContext';
import theme from './theme';
import api from './api';
import StartupScreen from './components/Common/StartupScreen';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { initVersionCheck } from './utils/versionCheck';

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
import ArchivedStudents from './pages/ArchivedStudents';
import Courses from './pages/Courses';
import Calendar from './pages/Calendar';
import Instructors from './pages/Instructors';
import InstructorDetail from './pages/InstructorDetail';
import Payments from './pages/Payments';
import PaymentPlan from './pages/PaymentPlan';
import PaymentPlanDetail from './pages/PaymentPlanDetail';
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

// ProtectedRoute component with permission check
const ProtectedRoute = ({ children, permission }) => {
  const { currentUser } = useApp();

  // Check if user has permission (only superadmin bypasses)
  const hasPermission = () => {
    if (!permission) return true; // No permission required
    if (currentUser?.role === 'superadmin') return true;
    return currentUser?.permissions?.[permission] !== false;
  };

  if (!hasPermission()) {
    return <Navigate to="/" replace />;
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
  // Initialize version checking on app start
  useEffect(() => {
    initVersionCheck();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StartupScreen>
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
                      <Route path="/institutions" element={<ProtectedRoute permission="canManageSettings"><Institutions /></ProtectedRoute>} />
                      <Route path="/institution-setup" element={<ProtectedRoute permission="canManageSettings"><InstitutionSetup /></ProtectedRoute>} />
                      <Route path="/seasons" element={<ProtectedRoute permission="canManageSettings"><SeasonManagement /></ProtectedRoute>} />
                      <Route path="/students" element={<ProtectedRoute permission="canManageStudents"><Students /></ProtectedRoute>} />
                      <Route path="/students/new" element={<ProtectedRoute permission="canManageStudents"><StudentForm /></ProtectedRoute>} />
                      <Route path="/students/:id" element={<ProtectedRoute permission="canManageStudents"><StudentDetail /></ProtectedRoute>} />
                      <Route path="/students/:id/edit" element={<ProtectedRoute permission="canManageStudents"><StudentForm /></ProtectedRoute>} />
                      <Route path="/archived-students" element={<ProtectedRoute permission="canManageStudents"><ArchivedStudents /></ProtectedRoute>} />
                      <Route path="/courses" element={<ProtectedRoute permission="canManageCourses"><Courses /></ProtectedRoute>} />
                      <Route path="/calendar" element={<ProtectedRoute permission="canViewCalendar"><Calendar /></ProtectedRoute>} />
                      <Route path="/instructors" element={<ProtectedRoute permission="canManageInstructors"><Instructors /></ProtectedRoute>} />
                      <Route path="/instructors/:id" element={<ProtectedRoute permission="canManageInstructors"><InstructorDetail /></ProtectedRoute>} />
                      <Route path="/payments" element={<ProtectedRoute permission="canManagePayments"><Payments /></ProtectedRoute>} />
                      <Route path="/payment-plan/:studentId" element={<ProtectedRoute permission="canManagePayments"><PaymentPlan /></ProtectedRoute>} />
                      <Route path="/payment-plan-detail/:id" element={<ProtectedRoute permission="canManagePayments"><PaymentPlanDetail /></ProtectedRoute>} />
                      <Route path="/expenses" element={<ProtectedRoute permission="canManageExpenses"><Expenses /></ProtectedRoute>} />
                      <Route path="/cash-registers" element={<ProtectedRoute permission="canViewCashRegisters"><CashRegisters /></ProtectedRoute>} />
                      <Route path="/trial-lessons" element={<ProtectedRoute permission="canManageTrialLessons"><TrialLessons /></ProtectedRoute>} />
                      <Route path="/phone-book" element={<PhoneBook />} />
                      <Route path="/message-templates" element={<MessageTemplates />} />
                      <Route path="/settings" element={<ProtectedRoute permission="canManageSettings"><Settings /></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute permission="canViewReports"><Reports /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute permission="canManageUsers"><Users /></ProtectedRoute>} />
                      <Route path="/activity-logs" element={<ProtectedRoute permission="canViewActivityLogs"><ActivityLogs /></ProtectedRoute>} />
                      <Route path="/backup" element={<ProtectedRoute permission="canManageSettings"><Backup /></ProtectedRoute>} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </MainLayout>
                </PrivateRoute>
              }
            />
          </Routes>
            </Router>
          </AppProvider>
        </StartupScreen>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
