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
  const { institution, season, institutions, seasons, changeInstitution, changeSeason, user, users, changeUser } = useApp();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getUserDisplay = () => {
    if (!user) return 'Kullanıcı Seçin';
    const userObj = users.find(u => u.username === user);
    return userObj ? userObj.fullName : user;
  };

  const getUserInitials = () => {
    if (!user) return '?';
    const userObj = users.find(u => u.username === user);
    if (userObj) {
      return userObj.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user.substring(0, 2).toUpperCase();
  };

  const getUserColor = () => {
    const userObj = users.find(u => u.username === user);
    return userObj?.avatarColor || '#1976d2';
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
          {/* Institution Selector */}
          {institutions.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={institution?._id || ''}
                onChange={(e) => changeInstitution(e.target.value)}
                displayEmpty
              >
                {institutions.map((inst) => (
                  <MenuItem key={inst._id} value={inst._id}>
                    {inst.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Season Selector */}
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

          {/* User Selector */}
          {users.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={user || ''}
                onChange={(e) => changeUser(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected) return 'Kullanıcı Seçin';
                  const userObj = users.find(u => u.username === selected);
                  return userObj?.fullName || selected;
                }}
              >
                <MenuItem value="" disabled>
                  Kullanıcı Seçin
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u._id} value={u.username}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: u.avatarColor, fontSize: 12 }}>
                        {u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                      </Avatar>
                      {u.fullName}
                    </Box>
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
            <MenuItemMui onClick={handleClose}>
              <Logout sx={{ mr: 1 }} />
              Kullanıcı Değiştir
            </MenuItemMui>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
