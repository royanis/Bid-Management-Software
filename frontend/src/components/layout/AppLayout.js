// src/components/layout/AppLayout.js

import React from 'react';
import { Box, Stepper, Step, StepLabel } from '@mui/material';
import { useWorkshopContext } from '../../context/WorkshopContext';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const steps = [
  'Client Context',
  'Pains & Gains',
  'SWOT Analysis',
  'Win Themes',
  'Prioritization',
  'Finalize',
];

const AppLayout = ({ children }) => {
  const { activeStep } = useWorkshopContext();

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      {/* Header */}
      <Header />

      <Box sx={{ mt: 4 }}>
        {children}
      </Box>
      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default AppLayout;