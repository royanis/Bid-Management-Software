import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#0D47A1', // Use a specific darker blue for better contrast
        color: 'white', // Ensure text remains white
        padding: '1rem',
        textAlign: 'center',
        marginTop: 'auto',
      }}
    >
      <Typography variant="body1">
        © {new Date().getFullYear()} Virtusa Corporation. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;