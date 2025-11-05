import React from 'react';
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
  AccountBalance as CashIcon,
  Science as TrialIcon,
  Contacts as PhoneBookIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assessment as ReportIcon,
  Layers as SeasonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

const menuItems = [
  { text: 'Panel', icon: <DashboardIcon />, path: '/' },
  { text: 'Kurum Yönetimi', icon: <BusinessIcon />, path: '/institutions' },
  { text: 'Kurum Ayarları', icon: <SchoolIcon />, path: '/institution-setup' },
  { text: 'Sezon Yönetimi', icon: <SeasonIcon />, path: '/seasons' },
  { divider: true },
  { text: 'Öğrenciler', icon: <PeopleIcon />, path: '/students' },
  { text: 'Dersler', icon: <MenuBookIcon />, path: '/courses' },
  { text: 'Takvim', icon: <CalendarIcon />, path: '/calendar' },
  { text: 'Eğitmenler', icon: <InstructorIcon />, path: '/instructors' },
  { text: 'Deneme Dersleri', icon: <TrialIcon />, path: '/trial-lessons' },
  { divider: true },
  { text: 'Ödemeler', icon: <PaymentIcon />, path: '/payments' },
  { text: 'Giderler', icon: <ExpenseIcon />, path: '/expenses' },
  { text: 'Kasa Yönetimi', icon: <CashIcon />, path: '/cash-registers' },
  { divider: true },
  { text: 'Telefon Rehberi', icon: <PhoneBookIcon />, path: '/phone-book' },
  { text: 'Mesaj Şablonları', icon: <MessageIcon />, path: '/message-templates' },
  { divider: true },
  { text: 'Raporlar', icon: <ReportIcon />, path: '/reports' },
  { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
];

const Sidebar = ({ drawerWidth, mobileOpen, handleDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ color: 'white' }}>
          FOFENK
        </Typography>
      </Toolbar>
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
