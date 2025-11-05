import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Box,
  Avatar,
  Menu,
  MenuItem as MenuItemMui,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ handleDrawerToggle }) => {
  const { institution, season, institutions, seasons, changeInstitution, changeSeason, currentUser, logout } = useApp();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getUserDisplay = () => {
    return currentUser?.fullName || 'User';
  };

  const getUserInitials = () => {
    if (!currentUser?.fullName) return '?';
    return currentUser.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getUserColor = () => {
    return currentUser?.avatarColor || '#1976d2';
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Institution Display (no longer selectable, selected at login) */}
          {institution && (
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {institution.name}
            </Typography>
          )}

          {/* Season Selector - still changeable */}
          {seasons.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={season?._id || ''}
                onChange={(e) => changeSeason(e.target.value)}
                displayEmpty
              >
                {seasons.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name} {s.isActive && '(Aktif)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' } }}>
            {getUserDisplay()}
          </Typography>
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: getUserColor() }}>
              {getUserInitials()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItemMui onClick={() => { handleClose(); navigate('/users'); }}>
              <AccountCircle sx={{ mr: 1 }} />
              Kullanıcı Yönetimi
            </MenuItemMui>
            <MenuItemMui onClick={() => { handleClose(); navigate('/activity-logs'); }}>
              <AccountCircle sx={{ mr: 1 }} />
              Aktivite Logları
            </MenuItemMui>
            <MenuItemMui onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Çıkış Yap
            </MenuItemMui>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
