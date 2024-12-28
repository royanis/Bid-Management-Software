// src/components/workshop/WinThemeWorkshopWizard.js
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Divider 
} from '@mui/material';
import { 
  useParams, 
  useNavigate, 
  useLocation 
} from 'react-router-dom';
import { 
  Home as HomeIcon, 
  ArrowBack as ArrowBackIcon, 
  ArrowForward as ArrowForwardIcon 
} from '@mui/icons-material';

import { useBidContext } from '../../context/BidContext';

// Import the steps
import ClientContextStep from './steps/ClientContextStep';
import PainGainStep from './steps/PainGainStep';
import SwotStep from './steps/SwotStep';
import BrainstormWinThemesStep from './steps/BrainstormWinThemesStep';
import PrioritizationStep from './steps/PrioritizationStep';
import FinalizeWinThemesStep from './steps/FinalizeWinThemesStep';

const WinThemeWorkshopWizard = () => {
  const { bidId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { bidData } = useBidContext();

  // All steps, in order
  const steps = [
    { label: 'Client Context', component: ClientContextStep },
    { label: 'Identify Pains & Gains', component: PainGainStep },
    { label: 'Develop SWOT', component: SwotStep },
    { label: 'Brainstorm Win Themes', component: BrainstormWinThemesStep },
    { label: 'Prioritization', component: PrioritizationStep },
    { label: 'Finalize Win Themes', component: FinalizeWinThemesStep },
  ];

  // Track which step index we’re on based on URL
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (location.pathname.includes('/client-context')) {
      setCurrentStepIndex(0);
    } else if (location.pathname.includes('/pain-gain')) {
      setCurrentStepIndex(1);
    } else if (location.pathname.includes('/swot')) {
      setCurrentStepIndex(2);
    } else if (location.pathname.includes('/win-themes')) {
      setCurrentStepIndex(3);
    } else if (location.pathname.includes('/prioritization')) {
      setCurrentStepIndex(4);
    } else if (location.pathname.includes('/finalize')) {
      setCurrentStepIndex(5);
    }
  }, [location.pathname]);

  // The current step’s component
  const CurrentStepComponent = steps[currentStepIndex]?.component || null;

  // Navigation Handlers
  const handleHome = () => {
    navigate('/');
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);

      // Navigate to the route for newIndex
      switch (newIndex) {
        case 0:
          navigate(`/win-theme-workshop/${bidId}/client-context`);
          break;
        case 1:
          navigate(`/win-theme-workshop/${bidId}/pain-gain`);
          break;
        case 2:
          navigate(`/win-theme-workshop/${bidId}/swot`);
          break;
        case 3:
          navigate(`/win-theme-workshop/${bidId}/win-themes`);
          break;
        case 4:
          navigate(`/win-theme-workshop/${bidId}/prioritization`);
          break;
        default:
          navigate('/manage-bid');
          break;
      }
    } else {
      // If we’re on the first step, go back to manage-bid
      navigate('/manage-bid');
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);

      // Navigate to route for newIndex
      switch (newIndex) {
        case 1:
          navigate(`/win-theme-workshop/${bidId}/pain-gain`);
          break;
        case 2:
          navigate(`/win-theme-workshop/${bidId}/swot`);
          break;
        case 3:
          navigate(`/win-theme-workshop/${bidId}/win-themes`);
          break;
        case 4:
          navigate(`/win-theme-workshop/${bidId}/prioritization`);
          break;
        case 5:
          navigate(`/win-theme-workshop/${bidId}/finalize`);
          break;
        default:
          navigate('/manage-bid');
          break;
      }
    } else {
      // If we’re already on the last step
      alert('Workshop completed! Your win themes have been finalized.');
      navigate('/manage-bid');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* 
        Remove the top progress bar. 
        Instead, we only show the step label below:
      */}
      <Typography
        variant="h4"
        color="primary"
        sx={{ fontWeight: 'bold', textAlign: 'center', mb: 2 }}
      >
        {steps[currentStepIndex].label}
      </Typography>

      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          {/* Render the current step’s content */}
          {CurrentStepComponent ? (
            <CurrentStepComponent />
          ) : (
            <Typography variant="body1" color="error">
              No component found for this step.
            </Typography>
          )}

          {/* Navigation Buttons */}
          <Grid container spacing={2} sx={{ mt: 4 }}>
            <Grid item xs={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<HomeIcon />}
                onClick={handleHome}
              >
                Home
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<ArrowBackIcon />}
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
              >
                {currentStepIndex === 0 ? 'Cancel' : 'Back'}
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Button
                variant="contained"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                onClick={handleNext}
              >
                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Box>
  );
};

export default WinThemeWorkshopWizard;