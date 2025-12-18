import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  MenuBook as MenuBookIcon,
  CalendarMonth as CalendarIcon,
  Person as InstructorIcon,
  Payment as PaymentIcon,
  Receipt as ExpenseIcon,
  Repeat as RecurringIcon,
  AccountBalance as CashIcon,
  Science as TrialIcon,
  Contacts as PhoneBookIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assessment as ReportIcon,
  Layers as SeasonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import useServerHealth from '../../hooks/useServerHealth';
import ServerStatusIndicator from '../Common/ServerStatusIndicator';
import { useApp } from '../../context/AppContext';

// Menu items with permission requirements
const allMenuItems = [
  { text: 'Panel', icon: <DashboardIcon />, path: '/' },
  { divider: true, group: 'management' },
  { text: 'Öğrenciler', icon: <PeopleIcon />, path: '/students', permission: 'canManageStudents' },
  { text: 'Dersler', icon: <MenuBookIcon />, path: '/courses', permission: 'canManageCourses' },
  { text: 'Takvim', icon: <CalendarIcon />, path: '/calendar', permission: 'canViewCalendar' },
  { text: 'Eğitmenler', icon: <InstructorIcon />, path: '/instructors', permission: 'canManageInstructors' },
  { text: 'Deneme Dersleri', icon: <TrialIcon />, path: '/trial-lessons', permission: 'canManageCourses' },
  { divider: true, group: 'financial' },
  { text: 'Ödemeler', icon: <PaymentIcon />, path: '/payments', permission: 'canManagePayments' },
  { text: 'Giderler', icon: <ExpenseIcon />, path: '/expenses', permission: 'canManageExpenses' },
  { text: 'Düzenli Giderler', icon: <RecurringIcon />, path: '/recurring-expenses', permission: 'canManageExpenses' },
  { text: 'Kasa Yönetimi', icon: <CashIcon />, path: '/cash-registers', permission: 'canManageExpenses' },
  { divider: true, group: 'communication' },
  { text: 'Telefon Rehberi', icon: <PhoneBookIcon />, path: '/phone-book' },
  { text: 'Mesaj Şablonları', icon: <MessageIcon />, path: '/message-templates' },
  { divider: true, group: 'system' },
  { text: 'Raporlar', icon: <ReportIcon />, path: '/reports', permission: 'canViewReports' },
  { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings', permission: 'canManageSettings' },
];

const Sidebar = ({ drawerWidth, mobileOpen, handleDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, lastChecked } = useServerHealth();
  const { currentUser, institution } = useApp();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Get logo URL if institution has logo
  const logoUrl = useMemo(() => {
    if (institution?.logo) {
      // Check if it's already a Base64 data URL
      if (institution.logo.startsWith('data:')) {
        return institution.logo;
      }
      // Legacy file path format - construct URL
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiUrl.replace('/api', '');
      return `${baseUrl}/${institution.logo}`;
    }
    return null;
  }, [institution]);

  // Check if user has permission (only superadmin bypasses permission checks)
  const hasPermission = (permission) => {
    if (!permission) return true; // No permission required
    if (currentUser?.role === 'superadmin') return true; // Only superadmin bypasses
    return currentUser?.permissions?.[permission] !== false;
  };

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter((item, index, arr) => {
    if (item.divider) {
      // Check if there are any visible items after this divider
      const nextDividerIndex = arr.findIndex((i, idx) => idx > index && i.divider);
      const itemsInGroup = arr.slice(index + 1, nextDividerIndex === -1 ? arr.length : nextDividerIndex);
      const hasVisibleItems = itemsInGroup.some(i => !i.divider && hasPermission(i.permission));
      return hasVisibleItems;
    }
    return hasPermission(item.permission);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          {logoUrl ? (
            <Box
              component="img"
              src={logoUrl}
              alt={institution?.name || 'Logo'}
              sx={{
                height: 40,
                maxWidth: 180,
                objectFit: 'contain',
                flexGrow: 1,
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <Typography variant="h6" noWrap component="div" sx={{ color: 'white', flexGrow: 1 }}>
              {institution?.name || 'FOFENK'}
            </Typography>
          )}
          <ServerStatusIndicator status={status} lastChecked={lastChecked} />
        </Box>
      </Toolbar>

      {/* Date and Time Display */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500,
            fontSize: '0.875rem',
            letterSpacing: '0.5px',
            mb: 0.5
          }}
        >
          {formatDate(currentDateTime)}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            fontSize: '1.25rem',
            fontFamily: 'monospace',
            letterSpacing: '1px'
          }}
        >
          {formatTime(currentDateTime)}
        </Typography>
      </Box>

      <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item, index) => {
          if (item.divider) {
            return (
              <Divider
                key={`divider-${index}`}
                sx={{ my: 1, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
              />
            );
          }

          const isActive = location.pathname === item.path;

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) {
                    handleDrawerToggle();
                  }
                }}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'rgba(255, 255, 255, 0.7)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.7)',
                    '& .MuiTypography-root': {
                      fontWeight: isActive ? 600 : 400,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
