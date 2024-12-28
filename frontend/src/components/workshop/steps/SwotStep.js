// src/components/workshop/steps/SwotStep.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Snackbar,
  Alert,
  LinearProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useBidContext } from '../../../context/BidContext';
import Joyride from 'react-joyride';
import SWOTForceDirected from './SWOTForceDirected';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Icon for step indicator

const SwotStep = () => {
  const { bidId } = useParams();
  const navigate = useNavigate();
  const {
    bidData,
    updateBidData,
    loading,
    error,
    showSnackbar,
  } = useBidContext();

  // **State Hooks**
  const [newText, setNewText] = useState('');
  const [newQuadrant, setNewQuadrant] = useState('strengths');
  const [runTour, setRunTour] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // **Snackbar Handler**
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // **Cluster Centers for SWOT Quadrants**
  const width = 1200;
  const height = 700;

  const clusterCenters = useMemo(() => ({
    strengths: { x: width * 0.25, y: height * 0.3 },
    weaknesses: { x: width * 0.75, y: height * 0.3 },
    opportunities: { x: width * 0.25, y: height * 0.7 },
    threats: { x: width * 0.75, y: height * 0.7 },
  }), [width, height]);

  // **Define Steps for the Workshop**
  const steps = [
    'Client Context',
    'Pains & Gains',
    'SWOT',
    'Brainstorm Win Themes',
    'Prioritization',
    'Finalize',
  ];

  // **Determine the Active Step**
  // Since this is the SWOT step, which is step 3 (0-based index 2)
  const activeStep = 2;

  // **Initialize SWOT Items**
  const initializeSwotItems = (items, type) => {
    return Array.isArray(items)
      ? items.map((item) => ({
          id: item.id || uuidv4(),
          text: item.text || item,
          votes: item.votes || 0,
          type: type, // Define type for categorization
          position: {
            x: item.position?.x || clusterCenters[type].x,
            y: item.position?.y || clusterCenters[type].y,
          },
          size: {
            width: item.size?.width || 200,
            height: item.size?.height || 120,
          },
        }))
      : [];
  };

  const initialStrengths = useMemo(() => initializeSwotItems(bidData.workshop.swot?.strengths, 'strengths'), [bidData.workshop.swot?.strengths, clusterCenters]);
  const initialWeaknesses = useMemo(() => initializeSwotItems(bidData.workshop.swot?.weaknesses, 'weaknesses'), [bidData.workshop.swot?.weaknesses, clusterCenters]);
  const initialOpportunities = useMemo(() => initializeSwotItems(bidData.workshop.swot?.opportunities, 'opportunities'), [bidData.workshop.swot?.opportunities, clusterCenters]);
  const initialThreats = useMemo(() => initializeSwotItems(bidData.workshop.swot?.threats, 'threats'), [bidData.workshop.swot?.threats, clusterCenters]);

  const [strengths, setStrengths] = useState(initialStrengths);
  const [weaknesses, setWeaknesses] = useState(initialWeaknesses);
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [threats, setThreats] = useState(initialThreats);

  // **Combine SWOT Items for Visualization**
  const getCombinedItems = useCallback(() => {
    if (!bidData?.workshop?.swot) return [];
    return [
      ...strengths.map((item) => ({ ...item, cluster: 'strengths' })),
      ...weaknesses.map((item) => ({ ...item, cluster: 'weaknesses' })),
      ...opportunities.map((item) => ({ ...item, cluster: 'opportunities' })),
      ...threats.map((item) => ({ ...item, cluster: 'threats' })),
    ];
  }, [strengths, weaknesses, opportunities, threats, bidData]);

  // **Set Combined SWOT Items**
  const setCombinedItems = useCallback((allItems) => {
    const newStrengths = allItems
      .filter((it) => it.cluster === 'strengths')
      .map((x) => ({ ...x, cluster: undefined }));
    const newWeaknesses = allItems
      .filter((it) => it.cluster === 'weaknesses')
      .map((x) => ({ ...x, cluster: undefined }));
    const newOpportunities = allItems
      .filter((it) => it.cluster === 'opportunities')
      .map((x) => ({ ...x, cluster: undefined }));
    const newThreats = allItems
      .filter((it) => it.cluster === 'threats')
      .map((x) => ({ ...x, cluster: undefined }));

    setStrengths(newStrengths);
    setWeaknesses(newWeaknesses);
    setOpportunities(newOpportunities);
    setThreats(newThreats);
  }, []);

  // **Sync SWOT Data with Backend**
  useEffect(() => {
    const updatedSwot = {
      strengths: strengths.map((s) => ({ ...s, cluster: undefined })), // Remove 'cluster' before saving
      weaknesses: weaknesses.map((w) => ({ ...w, cluster: undefined })),
      opportunities: opportunities.map((o) => ({ ...o, cluster: undefined })),
      threats: threats.map((t) => ({ ...t, cluster: undefined })),
    };

    // Deep comparison to prevent unnecessary updates
    const isSwotChanged = JSON.stringify(updatedSwot) !== JSON.stringify(bidData.workshop.swot);

    if (isSwotChanged) {
      updateBidData({
        bidId: bidId,
        workshop: {
          ...bidData.workshop,
          swot: updatedSwot,
        },
      });
    }
  }, [strengths, weaknesses, opportunities, threats, updateBidData, bidId, bidData.workshop.swot]);

  // **Handle Adding a New SWOT Item**
  const handleAddItem = () => {
    if (!newText.trim()) {
      setSnackbar({ open: true, message: 'Cannot add empty text.', severity: 'warning' });
      return;
    }

    // Ensure the new item starts at the center of its quadrant
    const newItem = {
      id: uuidv4(), // Use uuidv4 for consistency
      text: newText.trim(),
      votes: 0,
      cluster: newQuadrant,
      position: { ...clusterCenters[newQuadrant] }, // Set position to quadrant center
      size: { width: 200, height: 120 }, // Default size
      // Add other properties as needed
    };

    const updated = [...getCombinedItems(), newItem];
    setCombinedItems(updated);
    setNewText('');
    setNewQuadrant('strengths');
    setSnackbar({ open: true, message: `Added to ${capitalize(newQuadrant)}.`, severity: 'success' });
  };

  // **Utility Function to Capitalize Strings**
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // **Define Steps for Joyride Tutorial**
  const joyrideSteps = [
    {
      target: '.add-swot-item-field',
      content: 'Type your new SWOT item text here.',
    },
    {
      target: '.add-swot-item-button',
      content: 'Select a quadrant and click + Add.',
    },
    {
      target: '.force-viz',
      content: 'Drag items around. Drag closer to another quadrant to reassign it!',
    },
    {
      target: '.bubble-node',
      content: 'Click a bubble to edit, vote, or delete it.',
    },
  ];

  // **Early Returns for Loading and Error States**
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <Typography>Loading SWOT data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // **Combine SWOT Items for Visualization**
  const combinedItems = getCombinedItems();

  return (
    <Box sx={{ maxWidth: 1300, mx: 'auto', p: 3 }}>
      {/* **Joyride for Interactive Tutorials** */}
      <Joyride
        run={runTour}
        continuous
        showSkipButton
        steps={joyrideSteps}
        styles={{ options: { zIndex: 9999 } }}
        callback={(data) => {
          if (data.status === 'finished' || data.status === 'skipped') {
            setRunTour(false);
          }
        }}
      />

      {/* **Snackbar for User Feedback** */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* **Stepper for Step Names (Removed and Replaced with Grid)** */}
      {/* Remove Stepper and use Grid similar to PainGainStep.jsx */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} justifyContent="center" alignItems="center">
          {steps.map((label, index) => (
            <Grid item key={label}>
              <Typography
                sx={{
                  fontWeight: index === activeStep ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {index + 1}. {label}
                {index < activeStep && <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 0.5 }} />}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* **Step Indicator and Progress Bar** */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Step {activeStep + 1} of {steps.length}
        </Typography>
        <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} sx={{ height: 10, borderRadius: 5 }} />
      </Box>

      {/* **Step Title** */}
      <Typography variant="h4" align="center" sx={{ mb: 3, fontWeight: 'bold' }}>
        Force-Directed SWOT
      </Typography>

      {/* **Add SWOT Item Section** */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f9fcff' }} elevation={2}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={7}>
            <TextField
              label="Add SWOT item..."
              variant="outlined"
              size="small"
              fullWidth
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItem();
                }
              }}
              className="add-swot-item-field"
              aria-label="Add SWOT item"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              label="Quadrant"
              variant="outlined"
              size="small"
              value={newQuadrant}
              onChange={(e) => setNewQuadrant(e.target.value)}
              fullWidth
              aria-label="Select SWOT quadrant"
            >
              <MenuItem value="strengths">Strength</MenuItem>
              <MenuItem value="weaknesses">Weakness</MenuItem>
              <MenuItem value="opportunities">Opportunity</MenuItem>
              <MenuItem value="threats">Threat</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              onClick={handleAddItem}
              className="add-swot-item-button"
              fullWidth
              aria-label="Add SWOT item"
            >
              + Add
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* **Force-Directed Visualization** */}
      <Box className="force-viz" sx={{ border: '2px solid #ddd', borderRadius: 2, p: 2, mb: 3 }}>
        <SWOTForceDirected items={combinedItems} setItems={setCombinedItems} />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* **Navigation Buttons** */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            onClick={() => navigate(`/win-theme-workshop/${bidId}/previous-step`)}
            aria-label="Previous Step"
          >
            Previous
          </Button>
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate(`/win-theme-workshop/${bidId}/win-themes`)}
          aria-label="Next Step"
        >
          Next &gt;
        </Button>
      </Box>
    </Box>
  );
};

// **Utility Function to Capitalize Strings (if not defined elsewhere)**
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default SwotStep;