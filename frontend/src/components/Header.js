import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';

const Header = () => {
  const virtusaLogo = process.env.PUBLIC_URL + '/virtusa-logo.png';

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Box display="flex" alignItems="center">
          <img src={virtusaLogo} alt="Virtusa Logo" style={{ height: 40, marginRight: 10 }} />
          <Typography variant="h6" component="div">
            Bid Management System
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;