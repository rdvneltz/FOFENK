import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AppProvider } from './context/AppContext';
import theme from './theme';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Pages
import Dashboard from './pages/Dashboard';
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

import { Box } from '@mui/material';

const DRAWER_WIDTH = 260;

function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <Router>
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
                <Routes>
                  <Route path="/" element={<Dashboard />} />
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
              </Box>
            </Box>
          </Box>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
