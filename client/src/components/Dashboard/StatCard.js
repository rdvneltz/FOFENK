import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StatCard = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  trendValue,
  subtitle,
  onClick,
}) => {
  return (
    <Card
      elevation={2}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography color="text.secondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && trendValue && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend === 'up' ? (
                  <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: trend === 'up' ? 'success.main' : 'error.main',
                  }}
                >
                  {trendValue}
                </Typography>
              </Box>
            )}
          </Box>
          {icon && (
            <Avatar
              sx={{
                bgcolor: `${color}.light`,
                width: 56,
                height: 56,
              }}
            >
              {React.cloneElement(icon, {
                sx: { color: `${color}.main`, fontSize: 32 },
              })}
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
