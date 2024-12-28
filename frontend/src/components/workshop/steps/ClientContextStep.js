// src/components/workshop/steps/ClientContextStep.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  Divider,
  TextField,
  Chip,
  Stack,
  Button,
  Grid,
  Snackbar,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useParams } from 'react-router-dom';
import { useBidContext } from '../../../context/BidContext';
import { useWorkshopContext } from '../../../context/WorkshopContext'; // Import Workshop Context
import { v4 as uuidv4 } from 'uuid'; // Import UUID

// Predefined Objectives and Criteria
const predefinedObjectives = [
  'Accelerate digital transformation',
  'Enhance customer experience',
  'Expand market share',
  'Improve operational efficiency',
];

const predefinedCriteria = [
  'Technical expertise',
  'Competitive pricing',
  'Cultural fit',
  'Proven track record',
  'Strong delivery methodology',
];

const ClientContextStep = () => {
  const navigate = useNavigate();
  const { bidId } = useParams();
  const { bidData, setBidData } = useBidContext();
  const { setActiveStep } = useWorkshopContext(); // from context

  // Snackbar State for Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Initialize Objectives with unique IDs, preserving existing ones
  const initialObjectives = useMemo(() => {
    return Array.isArray(bidData?.workshop?.clientContext?.objectives)
      ? bidData.workshop.clientContext.objectives.map((obj) => ({
          id: obj.id || uuidv4(), // Preserve existing ID or generate a new one
          text: obj.text || obj, // Adjust based on data structure
        }))
      : [];
  }, [bidData.workshop.clientContext?.objectives]);

  // Initialize Evaluation Criteria with unique IDs, preserving existing ones
  const initialCriteria = useMemo(() => {
    return Array.isArray(bidData?.workshop?.clientContext?.evaluationCriteria)
      ? bidData.workshop.clientContext.evaluationCriteria.map((crit) => ({
          id: crit.id || uuidv4(), // Preserve existing ID or generate a new one
          text: crit.text || crit, // Adjust based on data structure
        }))
      : [];
  }, [bidData.workshop.clientContext?.evaluationCriteria]);

  const [context, setContext] = useState({
    objectives: initialObjectives,
    evaluationCriteria: initialCriteria,
  });

  const [newObjective, setNewObjective] = useState('');
  const [newCriterion, setNewCriterion] = useState('');

  // On mount, set this as the active step
  useEffect(() => {
    setActiveStep(0);
  }, [setActiveStep]);

  // Initialize clientContext if it doesn't exist to prevent infinite loop
  useEffect(() => {
    if (bidData && !bidData.workshop.clientContext) {
      const initializedContext = {
        objectives: [],
        evaluationCriteria: [],
      };
      setBidData((prev) => ({
        ...prev,
        workshop: {
          ...prev.workshop,
          clientContext: initializedContext,
        },
      }));
      setContext(initializedContext);
      setSnackbar({ open: true, message: 'Initialized Client Context.', severity: 'info' });
    } else if (bidData && bidData.workshop.clientContext) {
      const updatedContext = {
        objectives: Array.isArray(bidData.workshop.clientContext.objectives)
          ? bidData.workshop.clientContext.objectives.map((obj) => ({
              id: obj.id || uuidv4(),
              text: obj.text || obj,
            }))
          : [],
        evaluationCriteria: Array.isArray(bidData.workshop.clientContext.evaluationCriteria)
          ? bidData.workshop.clientContext.evaluationCriteria.map((crit) => ({
              id: crit.id || uuidv4(),
              text: crit.text || crit,
            }))
          : [],
      };
      setContext(updatedContext);
    }
  }, [bidData, setBidData]);

  if (!bidData) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Loading bid data...</Typography>
      </Box>
    );
  }

  const handleContextUpdate = (updates) => {
    const updatedContext = { ...context, ...updates };
    setContext(updatedContext);
    if (typeof setBidData === 'function') {
      setBidData((prev) => ({
        ...prev,
        workshop: {
          ...prev.workshop,
          clientContext: updatedContext,
        },
      }));
    } else {
      console.warn('setBidData is not a function. Could not update bid data.');
    }
  };

  const handleAddObjective = (obj) => {
    if (obj && !context.objectives.some((o) => o.text.toLowerCase() === obj.trim().toLowerCase())) {
      const newObj = { id: uuidv4(), text: obj.trim() };
      handleContextUpdate({ objectives: [...context.objectives, newObj] });
      setSnackbar({ open: true, message: 'Objective added successfully!', severity: 'success' });
    } else if (context.objectives.some((o) => o.text.toLowerCase() === obj.trim().toLowerCase())) {
      setSnackbar({ open: true, message: 'This objective already exists.', severity: 'error' });
    }
  };

  const handleRemoveObjective = (id) => {
    handleContextUpdate({
      objectives: context.objectives.filter((obj) => obj.id !== id),
    });
    setSnackbar({ open: true, message: 'Objective removed successfully!', severity: 'info' });
  };

  const handleAddCriterion = (crit) => {
    if (crit && !context.evaluationCriteria.some((c) => c.text.toLowerCase() === crit.trim().toLowerCase())) {
      const newCrit = { id: uuidv4(), text: crit.trim() };
      handleContextUpdate({ evaluationCriteria: [...context.evaluationCriteria, newCrit] });
      setSnackbar({ open: true, message: 'Evaluation Criterion added successfully!', severity: 'success' });
    } else if (context.evaluationCriteria.some((c) => c.text.toLowerCase() === crit.trim().toLowerCase())) {
      setSnackbar({ open: true, message: 'This evaluation criterion already exists.', severity: 'error' });
    }
  };

  const handleRemoveCriterion = (id) => {
    handleContextUpdate({
      evaluationCriteria: context.evaluationCriteria.filter((crit) => crit.id !== id),
    });
    setSnackbar({ open: true, message: 'Evaluation Criterion removed successfully!', severity: 'info' });
  };

  const handleNewObjectiveKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddObjective(newObjective);
      setNewObjective('');
    }
  };

  const handleNewCriterionKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCriterion(newCriterion);
      setNewCriterion('');
    }
  };

  // Navigation Handlers
  const handlePreviousClick = () => {
    navigate(`/win-theme-workshop/${bidId}/previous-step`); // Update with actual path
  };

  const handleNextClick = () => {
    // Optional: Validate that at least one objective and criterion are present
    if (context.objectives.length === 0 || context.evaluationCriteria.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one objective and one evaluation criterion before proceeding.',
        severity: 'warning',
      });
      return;
    }
    navigate(`/win-theme-workshop/${bidId}/pain-gain`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/*
        1) Snackbar for User Feedback
      */}
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

      {/*
        2) Header with consistent styling
      */}
      <Typography
        variant="h5"
        color="primary"
        sx={{
          fontWeight: 'bold',
          textAlign: 'center',
          mt: 2,
          p: 2,
          backgroundColor: '#e3f2fd',
          borderRadius: 2,
        }}
      >
        Understand the Client Context
      </Typography>

      {/*
        3) Step Indicator and Progress Bar
      */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Step 1 of 6
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Typography>
              1. Client Context <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              2. Pains & Gains
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              3. SWOT
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              4. Brainstorm Win Themes
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              5. Prioritization
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              6. Finalize
            </Typography>
          </Grid>
        </Grid>
        <Box sx={{ mx: 4, mt: 1 }}>
          <LinearProgress variant="determinate" value={(1 / 6) * 100} />
        </Box>
      </Box>

      {/*
        4) Step Description
      */}
      <Typography
        variant="body1"
        color="textSecondary"
        sx={{ textAlign: 'center', mb: 3 }}
      >
        Identify the client's key strategic objectives and the criteria they will 
        use to evaluate your proposal. Select from common suggestions or add your own.
      </Typography>

      {/*
        5) Objectives and Evaluation Criteria Cards
      */}
      <Grid container spacing={4}>
        {/* Objectives Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ backgroundColor: '#fafafa', borderRadius: 2, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>
              Client's Strategic Objectives
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }} color="textSecondary">
              Click a suggestion or add your own. Press "Enter" to add.
            </Typography>

            {/* Predefined Objectives */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {predefinedObjectives.map((obj, idx) => (
                  <Chip
                    key={idx}
                    label={obj}
                    variant="outlined"
                    onClick={() => handleAddObjective(obj)}
                    icon={<AddCircleOutlineIcon />}
                    sx={{ mb: 1, cursor: 'pointer' }}
                    aria-label={`Add Objective: ${obj}`}
                  />
                ))}
              </Stack>
            </Box>

            {/* Current Objectives */}
            <Box sx={{ mb: 2 }}>
              {context.objectives.length > 0 && (
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Current Objectives:
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {context.objectives.map((obj) => (
                  <Chip
                    key={obj.id}
                    label={obj.text}
                    onDelete={() => handleRemoveObjective(obj.id)}
                    deleteIcon={<CloseIcon />}
                    color="primary"
                    sx={{ mb: 1 }}
                    aria-label={`Remove Objective: ${obj.text}`}
                  />
                ))}
              </Stack>
            </Box>

            {/* Add New Objective */}
            <TextField
              label="Add a custom objective"
              variant="outlined"
              fullWidth
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={handleNewObjectiveKeyDown}
              placeholder="e.g., Increase revenue by 20%..."
              sx={{ mb: 1 }}
              size="small"
              aria-label="Add a custom objective"
            />
          </Card>
        </Grid>

        {/* Evaluation Criteria Card */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ backgroundColor: '#fafafa', borderRadius: 2, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>
              Evaluation Criteria
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }} color="textSecondary">
              Click a suggestion or add your own. Press "Enter" to add.
            </Typography>

            {/* Predefined Criteria */}
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {predefinedCriteria.map((crit, idx) => (
                  <Chip
                    key={idx}
                    label={crit}
                    variant="outlined"
                    onClick={() => handleAddCriterion(crit)}
                    icon={<AddCircleOutlineIcon />}
                    sx={{ mb: 1, cursor: 'pointer' }}
                    aria-label={`Add Evaluation Criterion: ${crit}`}
                  />
                ))}
              </Stack>
            </Box>

            {/* Current Evaluation Criteria */}
            <Box sx={{ mb: 2 }}>
              {context.evaluationCriteria.length > 0 && (
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Current Criteria:
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {context.evaluationCriteria.map((crit) => (
                  <Chip
                    key={crit.id}
                    label={crit.text}
                    onDelete={() => handleRemoveCriterion(crit.id)}
                    deleteIcon={<CloseIcon />}
                    color="secondary"
                    sx={{ mb: 1 }}
                    aria-label={`Remove Evaluation Criterion: ${crit.text}`}
                  />
                ))}
              </Stack>
            </Box>

            {/* Add New Evaluation Criterion */}
            <TextField
              label="Add a custom criterion"
              variant="outlined"
              fullWidth
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              onKeyDown={handleNewCriterionKeyDown}
              placeholder="e.g., Strong local presence..."
              sx={{ mb: 1 }}
              size="small"
              aria-label="Add a custom evaluation criterion"
            />
          </Card>
        </Grid>
      </Grid>

      {/*
        6) Divider for Separation
      */}
      <Divider sx={{ my: 3 }} />

      {/*
        7) Navigation Buttons with consistent styling
      */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handlePreviousClick}
            aria-label="Previous Step"
          >
            Previous
          </Button>
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleNextClick}
          aria-label="Next Step"
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default ClientContextStep;