// src/components/workshop/steps/BrainstormWinThemesStep.js

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  Slider,
  Divider,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { useNavigate, useParams } from 'react-router-dom';
import { useBidContext } from '../../../context/BidContext';
import { v4 as uuidv4 } from 'uuid'; // Import UUID

// ---------- Helper Functions ----------

/**
 * Compute overall scores for a theme.
 * - avgPainsGains: Average applicability percentage of pains and gains.
 * - avgContextCriteria: Average applicability percentage of client context and evaluation criteria.
 * - avgCoverage: Average coverage score from SWOT linkages.
 * - finalCompositeScore = ((avgPainsGains + avgContextCriteria) / 2) * (avgCoverage / 100) / 25
 */
function computeOverallScore(theme) {
  const {
    linkages: {
      pains = [],
      gains = [],
      evaluationCriteria = [],
      clientContext = [],
    } = {},
    swotLinkages: {
      strengths = [],
      weaknesses = [],
      opportunities = [],
      threats = [],
    } = {},
  } = theme;

  // Calculate average applicability percentages for pains and gains
  const painsApplicability = pains.map((p) => (p.rating - 1) * 25 || 0); // 1 star = 0%, 5 stars = 100%
  const gainsApplicability = gains.map((g) => (g.rating - 1) * 25 || 0);
  const allPainsGains = [...painsApplicability, ...gainsApplicability];
  const avgPainsGains =
    allPainsGains.length > 0
      ? allPainsGains.reduce((acc, val) => acc + val, 0) / allPainsGains.length
      : 0;

  // Calculate average applicability percentages for client context and evaluation criteria
  const contextApplicability = clientContext.map((c) => (c.rating - 1) * 25 || 0);
  const criteriaApplicability = evaluationCriteria.map((c) => (c.rating - 1) * 25 || 0);
  const allContextCriteria = [...contextApplicability, ...criteriaApplicability];
  const avgContextCriteria =
    allContextCriteria.length > 0
      ? allContextCriteria.reduce((acc, val) => acc + val, 0) /
        allContextCriteria.length
      : 0;

  // Calculate average coverage score from SWOT linkages
  const coverageScores = [
    ...strengths.map((s) => s.coverageScore || 0),
    ...weaknesses.map((w) => w.coverageScore || 0),
    ...opportunities.map((o) => o.coverageScore || 0),
    ...threats.map((t) => t.coverageScore || 0),
  ];
  const avgCoverage =
    coverageScores.length > 0
      ? coverageScores.reduce((acc, val) => acc + val, 0) / coverageScores.length
      : 100; // Default to 100% if no coverage scores

  // Normalize coverage to a 0-1 scale
  const normalizedCoverage = avgCoverage / 100;

  // Compute final composite score, scaled back to a 0-5 range
  const finalCompositeScore =
    ((avgPainsGains + avgContextCriteria) / 2) * normalizedCoverage / 25; // 0-5

  // Round to one decimal place
  return {
    avgPainsGains: Math.round((avgPainsGains / 25) * 10) / 10, // Scale to 0-5
    avgContextCriteria: Math.round((avgContextCriteria / 25) * 10) / 10,
    avgCoverage: Math.round(avgCoverage * 10) / 10,
    finalCompositeScore: Math.round(finalCompositeScore * 10) / 10,
  };
}

/**
 * Bucket label logic: "High / Medium / Low"
 * Adjust thresholds as needed.
 */
function getBucketName(score) {
  if (score >= 4.0) return 'High';
  if (score >= 3.0) return 'Medium';
  return 'Low';
}

/**
 * Return tile background color depending on final composite score.
 * Adjust thresholds/colors as desired.
 */
function getTileColor(score) {
  if (score >= 4.0) return '#ecfdf3'; // Light greenish
  if (score >= 3.0) return '#fff4e5'; // Light orange
  return '#fdecea'; // Light red/pink
}

/**
 * Coverage score marks for the slider
 */
const coverageMarks = [
  { value: 0, label: '0%' },
  { value: 20, label: '20%' },
  { value: 40, label: '40%' },
  { value: 60, label: '60%' },
  { value: 80, label: '80%' },
  { value: 100, label: '100%' },
];

// ---------- Main Component ----------
export default function BrainstormWinThemesStep() {
  const navigate = useNavigate();
  const { bidId } = useParams();
  const { bidData, setBidData } = useBidContext();

  // Step # for "Step 4 of 6"
  const totalSteps = 6;
  const currentStep = 4;
  const progressValue = (currentStep / totalSteps) * 100;

  // ---------- Retrieve or initialize from bidData ----------
  const clientObjectives = useMemo(
    () => bidData?.workshop?.clientContext?.objectives || [],
    [bidData]
  );
  const evaluationCriteria = useMemo(
    () => bidData?.workshop?.clientContext?.evaluationCriteria || [],
    [bidData]
  );
  const pains = useMemo(() => bidData?.workshop?.pains || [], [bidData]);
  const gains = useMemo(() => bidData?.workshop?.gains || [], [bidData]);
  const swot = useMemo(
    () =>
      bidData?.workshop?.swot || {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      },
    [bidData]
  );

  // Debugging: Verify data retrieval
  useEffect(() => {
    console.log('Client Objectives:', clientObjectives);
    console.log('Evaluation Criteria:', evaluationCriteria);
    console.log('Pains:', pains);
    console.log('Gains:', gains);
    console.log('SWOT:', swot);
  }, [clientObjectives, evaluationCriteria, pains, gains, swot]);

  // We'll store the "winThemes" array in bidData
  // If it doesn't exist, initialize it
  const existingThemes = useMemo(
    () => bidData?.workshop?.winThemes || [],
    [bidData]
  );

  // Initialize winThemes ensuring all themes have scores and linkages
  const [winThemes, setWinThemes] = useState(() => {
    if (!existingThemes || existingThemes.length === 0) return [];
    return existingThemes.map((theme) => ({
      ...theme,
      linkages: {
        pains: theme.linkages?.pains || [],
        gains: theme.linkages?.gains || [],
        evaluationCriteria: theme.linkages?.evaluationCriteria || [],
        clientContext: theme.linkages?.clientContext || [],
      },
      swotLinkages: {
        strengths: theme.swotLinkages?.strengths || [],
        weaknesses: theme.swotLinkages?.weaknesses || [],
        opportunities: theme.swotLinkages?.opportunities || [],
        threats: theme.swotLinkages?.threats || [],
      },
      scores: theme.scores ? theme.scores : computeOverallScore(theme),
      selectedForPrioritization: theme.selectedForPrioritization || false,
    }));
  });

  useEffect(() => {
    // Sync themes and ensure scores and linkages are present
    const syncedThemes = existingThemes.map((theme) => {
      const updatedTheme = { ...theme };
      if (!theme.linkages) {
        updatedTheme.linkages = {
          pains: [],
          gains: [],
          evaluationCriteria: [],
          clientContext: [],
        };
      } else {
        updatedTheme.linkages = {
          pains: theme.linkages.pains || [],
          gains: theme.linkages.gains || [],
          evaluationCriteria: theme.linkages.evaluationCriteria || [],
          clientContext: theme.linkages.clientContext || [],
        };
      }

      if (!theme.swotLinkages) {
        updatedTheme.swotLinkages = {
          strengths: [],
          weaknesses: [],
          opportunities: [],
          threats: [],
        };
      } else {
        updatedTheme.swotLinkages = {
          strengths: theme.swotLinkages.strengths || [],
          weaknesses: theme.swotLinkages.weaknesses || [],
          opportunities: theme.swotLinkages.opportunities || [],
          threats: theme.swotLinkages.threats || [],
        };
      }

      if (!theme.scores) {
        updatedTheme.scores = computeOverallScore(updatedTheme);
      } else {
        // Recompute scores in case linkages have changed
        updatedTheme.scores = computeOverallScore(updatedTheme);
      }

      if (theme.selectedForPrioritization === undefined) {
        updatedTheme.selectedForPrioritization = false;
      }

      return updatedTheme;
    });

    // Only update if there are changes to avoid infinite loops
    if (JSON.stringify(syncedThemes) !== JSON.stringify(winThemes)) {
      setWinThemes(syncedThemes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingThemes]);

  // Anytime local changes happen, immediately push them to bidData
  useEffect(() => {
    if (JSON.stringify(winThemes) !== JSON.stringify(existingThemes)) {
      setBidData((prev) => ({
        ...prev,
        workshop: {
          ...prev.workshop,
          winThemes,
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winThemes]);

  // ---------- Add/Edit Dialog ----------
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);

  // ---------- Navigation Buttons ----------
  const navigateHome = () => {
    navigate('/');
  };
  const navigateBack = () => {
    navigate(`/win-theme-workshop/${bidId}/swot`);
  };
  const navigateNext = () => {
    navigate(`/win-theme-workshop/${bidId}/prioritization`);
  };

  // ---------- Snackbar for User Feedback ----------
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // ---------- Add / Edit a Win Theme ----------
  const handleOpenDialog = () => {
    // Build a blank theme with linkages
    const blankTheme = {
      id: `theme-${uuidv4()}`, // Use UUID for unique ID
      title: '',
      rationale: '',
      linkages: {
        pains: [], // To be filled by user
        gains: [],
        evaluationCriteria: [],
        clientContext: [],
      },
      swotLinkages: {
        strengths: [], // Each linkage will have an id and coverageScore
        weaknesses: [],
        opportunities: [],
        threats: [],
      },
      scores: {
        avgPainsGains: 0,
        avgContextCriteria: 0,
        avgCoverage: 100, // Default to 100%
        finalCompositeScore: 0,
      },
      selectedForPrioritization: false,
    };
    setEditingTheme(blankTheme);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setEditingTheme(null);
    setOpenDialog(false);
  };

  const handleEditTheme = (theme) => {
    setEditingTheme(theme);
    setOpenDialog(true);
  };

  const handleDeleteTheme = (themeId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this Win Theme?');
    if (confirmDelete) {
      setWinThemes((prev) => prev.filter((t) => t.id !== themeId));
    }
  };

  const handleSaveTheme = () => {
    if (!editingTheme) return;

    // Validation: Ensure title and at least one linkage
    if (!editingTheme.title.trim()) {
      setSnackbar({ open: true, message: 'Please provide a title for the Win Theme.', severity: 'error' });
      return;
    }

    // Check at least one linkage in pains, gains, evaluation criteria, or client context
    const hasLinkages =
      editingTheme.linkages.pains.length > 0 ||
      editingTheme.linkages.gains.length > 0 ||
      editingTheme.linkages.evaluationCriteria.length > 0 ||
      editingTheme.linkages.clientContext.length > 0;

    if (!hasLinkages) {
      setSnackbar({ open: true, message: 'Please assign at least one linkage.', severity: 'error' });
      return;
    }

    // Check that all selected linkages have valid ratings or coverage scores
    for (let p of editingTheme.linkages.pains) {
      if (p.rating === undefined || p.rating < 1 || p.rating > 5) {
        setSnackbar({ open: true, message: 'Please assign a valid rating for all selected pains.', severity: 'error' });
        return;
      }
    }
    for (let g of editingTheme.linkages.gains) {
      if (g.rating === undefined || g.rating < 1 || g.rating > 5) {
        setSnackbar({ open: true, message: 'Please assign a valid rating for all selected gains.', severity: 'error' });
        return;
      }
    }
    for (let c of editingTheme.linkages.evaluationCriteria) {
      if (c.rating === undefined || c.rating < 1 || c.rating > 5) {
        setSnackbar({ open: true, message: 'Please assign a valid rating for all selected evaluation criteria.', severity: 'error' });
        return;
      }
    }
    for (let cc of editingTheme.linkages.clientContext) {
      if (cc.rating === undefined || cc.rating < 1 || cc.rating > 5) {
        setSnackbar({ open: true, message: 'Please assign a valid rating for all selected client objectives.', severity: 'error' });
        return;
      }
    }

    for (let s of editingTheme.swotLinkages.strengths) {
      if (s.coverageScore === undefined || s.coverageScore < 0 || s.coverageScore > 100) {
        setSnackbar({ open: true, message: 'Please assign a valid coverage score for all selected strengths.', severity: 'error' });
        return;
      }
    }
    for (let w of editingTheme.swotLinkages.weaknesses) {
      if (w.coverageScore === undefined || w.coverageScore < 0 || w.coverageScore > 100) {
        setSnackbar({ open: true, message: 'Please assign a valid coverage score for all selected weaknesses.', severity: 'error' });
        return;
      }
    }
    for (let o of editingTheme.swotLinkages.opportunities) {
      if (o.coverageScore === undefined || o.coverageScore < 0 || o.coverageScore > 100) {
        setSnackbar({ open: true, message: 'Please assign a valid coverage score for all selected opportunities.', severity: 'error' });
        return;
      }
    }
    for (let t of editingTheme.swotLinkages.threats) {
      if (t.coverageScore === undefined || t.coverageScore < 0 || t.coverageScore > 100) {
        setSnackbar({ open: true, message: 'Please assign a valid coverage score for all selected threats.', severity: 'error' });
        return;
      }
    }

    // Compute overall scores
    const scores = computeOverallScore(editingTheme);
    const finalTheme = { ...editingTheme, scores };

    setWinThemes((prev) => {
      const idx = prev.findIndex((t) => t.id === finalTheme.id);
      if (idx === -1) {
        return [...prev, finalTheme];
      } else {
        const copy = [...prev];
        copy[idx] = finalTheme;
        return copy;
      }
    });

    handleCloseDialog();
    setSnackbar({ open: true, message: 'Win Theme saved successfully!', severity: 'success' });
  };

  // ---------- Bucket logic for UI display only ----------
  const sortedThemes = useMemo(() => {
    return [...winThemes].sort(
      (a, b) =>
        (b.scores?.finalCompositeScore || 0) -
        (a.scores?.finalCompositeScore || 0)
    );
  }, [winThemes]);

  const buckets = { High: [], Medium: [], Low: [] };
  sortedThemes.forEach((theme) => {
    const bucket = getBucketName(theme.scores?.finalCompositeScore || 0);
    buckets[bucket].push(theme);
  });

  // ---------- Toggle "selectedForPrioritization" ----------
  const handleToggleSelected = (themeId) => {
    setWinThemes((prev) =>
      prev.map((t) => {
        if (t.id === themeId) {
          return { ...t, selectedForPrioritization: !t.selectedForPrioritization };
        }
        return t;
      })
    );
  };

  // ---------- Render ----------
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/*
        1) Title / Explanation
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
        Brainstorm Your Win Themes
      </Typography>

      <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
        Develop Win Themes aligned with the client’s objectives, evaluation criteria,
        pains/gains, and SWOT analysis. Then categorize them below.
        Mark a theme "Selected" if you want to prioritize it in the next step.
      </Typography>

      {/*
        2) Step 4 of 6 + progress bar
      */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Step {currentStep} of {totalSteps}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography>
            1. Client Context{' '}
            <CheckCircleIcon color="success" fontSize="small" />
          </Typography>
          <Typography>
            2. Pains & Gains{' '}
            <CheckCircleIcon color="success" fontSize="small" />
          </Typography>
          <Typography>
            3. SWOT <CheckCircleIcon color="success" fontSize="small" />
          </Typography>
          <Typography>4. Brainstorm Win Themes</Typography>
          <Typography>5. Prioritization</Typography>
          <Typography>6. Finalize</Typography>
        </Box>
        <Box sx={{ mx: 4, mt: 1 }}>
          <LinearProgress variant="determinate" value={progressValue} />
        </Box>
      </Box>

      {/*
        3) "Add Win Theme" button
      */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Win Theme
        </Button>
      </Box>

      {/*
        4) The Buckets
      */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* High Bucket */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'green' }}>
            High Bucket
          </Typography>
          {buckets.High.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No themes in this bucket
            </Typography>
          ) : (
            buckets.High.map((theme) => (
              <Card
                key={theme.id}
                sx={{
                  mb: 2,
                  p: 1,
                  backgroundColor: getTileColor(theme.scores.finalCompositeScore),
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {theme.title || 'Untitled'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
                  >
                    {theme.rationale || 'No description'}
                  </Typography>

                  {/* Score Breakdown */}
                  <Box sx={{ mt: 2 }}>
                    <Tooltip title="Average applicability based on selected pains and gains">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Pains & Gains Score: {theme.scores.avgPainsGains}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.avgPainsGains / 5) * 100}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    <Tooltip title="Average applicability based on selected client objectives and evaluation criteria">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Context & Criteria Score: {theme.scores.avgContextCriteria}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.avgContextCriteria / 5) * 100}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    <Tooltip title="Average coverage score from SWOT linkages">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Coverage Score: {theme.scores.avgCoverage}%
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={theme.scores.avgCoverage}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                      color="secondary"
                    />

                    <Divider sx={{ my: 1 }} />

                    <Tooltip title="Final composite score based on previous scores and coverage">
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Final Score: {theme.scores.finalCompositeScore}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.finalCompositeScore / 5) * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                </CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    pb: 1,
                  }}
                >
                  <Tooltip title="Edit Win Theme">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditTheme(theme)}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!theme.selectedForPrioritization}
                        onChange={() => handleToggleSelected(theme.id)}
                        aria-label={`Select Win Theme ${theme.title}`}
                      />
                    }
                    label="Select"
                  />
                  <Tooltip title="Delete Win Theme">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTheme(theme.id)}
                    >
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            ))
          )}
        </Box>

        {/* Medium Bucket */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'orange' }}>
            Medium Bucket
          </Typography>
          {buckets.Medium.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No themes in this bucket
            </Typography>
          ) : (
            buckets.Medium.map((theme) => (
              <Card
                key={theme.id}
                sx={{
                  mb: 2,
                  p: 1,
                  backgroundColor: getTileColor(theme.scores.finalCompositeScore),
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {theme.title || 'Untitled'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
                  >
                    {theme.rationale || 'No description'}
                  </Typography>

                  {/* Score Breakdown */}
                  <Box sx={{ mt: 2 }}>
                    <Tooltip title="Average applicability based on selected pains and gains">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Pains & Gains Score: {theme.scores.avgPainsGains}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.avgPainsGains / 5) * 100}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    <Tooltip title="Average applicability based on selected client objectives and evaluation criteria">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Context & Criteria Score: {theme.scores.avgContextCriteria}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.avgContextCriteria / 5) * 100}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    <Tooltip title="Average coverage score from SWOT linkages">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Coverage Score: {theme.scores.avgCoverage}%
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={theme.scores.avgCoverage}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                      color="secondary"
                    />

                    <Divider sx={{ my: 1 }} />

                    <Tooltip title="Final composite score based on previous scores and coverage">
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Final Score: {theme.scores.finalCompositeScore}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.finalCompositeScore / 5) * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                </CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    pb: 1,
                  }}
                >
                  <Tooltip title="Edit Win Theme">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditTheme(theme)}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!theme.selectedForPrioritization}
                        onChange={() => handleToggleSelected(theme.id)}
                        aria-label={`Select Win Theme ${theme.title}`}
                      />
                    }
                    label="Select"
                  />
                  <Tooltip title="Delete Win Theme">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTheme(theme.id)}
                    >
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            ))
          )}
        </Box>

        {/* Low Bucket */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'red' }}>
            Low Bucket
          </Typography>
          {buckets.Low.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No themes in this bucket
            </Typography>
          ) : (
            buckets.Low.map((theme) => (
              <Card
                key={theme.id}
                sx={{
                  mb: 2,
                  p: 1,
                  backgroundColor: getTileColor(theme.scores.finalCompositeScore),
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {theme.title || 'Untitled'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, whiteSpace: 'pre-wrap' }}
                  >
                    {theme.rationale || 'No description'}
                  </Typography>

                  {/* Score Breakdown */}
                  <Box sx={{ mt: 2 }}>
                    <Tooltip title="Average applicability based on selected pains and gains">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Pains & Gains Score: {theme.scores.avgPainsGains}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.avgPainsGains / 5) * 100}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    <Tooltip title="Average applicability based on selected client objectives and evaluation criteria">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Context & Criteria Score: {theme.scores.avgContextCriteria}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.avgContextCriteria / 5) * 100}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                    />

                    <Tooltip title="Average coverage score from SWOT linkages">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        Coverage Score: {theme.scores.avgCoverage}%
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={theme.scores.avgCoverage}
                      sx={{ height: 10, borderRadius: 5, mb: 1 }}
                      color="secondary"
                    />

                    <Divider sx={{ my: 1 }} />

                    <Tooltip title="Final composite score based on previous scores and coverage">
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Final Score: {theme.scores.finalCompositeScore}/5
                      </Typography>
                    </Tooltip>
                    <LinearProgress
                      variant="determinate"
                      value={(theme.scores.finalCompositeScore / 5) * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                </CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    pb: 1,
                  }}
                >
                  <Tooltip title="Edit Win Theme">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditTheme(theme)}
                    >
                      Edit
                    </Button>
                  </Tooltip>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!theme.selectedForPrioritization}
                        onChange={() => handleToggleSelected(theme.id)}
                        aria-label={`Select Win Theme ${theme.title}`}
                      />
                    }
                    label="Select"
                  />
                  <Tooltip title="Delete Win Theme">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTheme(theme.id)}
                    >
                      <DeleteIcon color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            ))
          )}
        </Box>
      </Box>

      {/*
        5) Navigation Buttons
      */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Go to Home">
            <Button variant="outlined" startIcon={<HomeIcon />} onClick={navigateHome}>
              Home
            </Button>
          </Tooltip>
          <Tooltip title="Go Back to SWOT Analysis">
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={navigateBack}>
              Back
            </Button>
          </Tooltip>
        </Box>
        <Tooltip title="Proceed to Prioritization">
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={navigateNext}>
            Next
          </Button>
        </Tooltip>
      </Box>

      {/*
        6) Add/Edit Dialog
      */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingTheme?.title ? 'Edit' : 'Add'} Win Theme</DialogTitle>
        {editingTheme && (
          <DialogContent dividers>
            {/* Basic Info */}
            <Box sx={{ mb: 2 }}>
              <TextField
                label="Theme Title"
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
                value={editingTheme.title}
                onChange={(e) =>
                  setEditingTheme((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
              <TextField
                label="Rationale / Description"
                fullWidth
                variant="outlined"
                multiline
                rows={2}
                value={editingTheme.rationale}
                onChange={(e) =>
                  setEditingTheme((prev) => ({ ...prev, rationale: e.target.value }))
                }
              />
            </Box>

            {/* Linkages with Ratings */}
            {/* 1. Addressing Pains */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>1. Addressing Pains</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {pains.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No pains available to link.
                  </Typography>
                ) : (
                  pains.map((pain) => {
                    const linkageId = `pains-${pain.id}`; // Deterministic linkageId
                    // Find existing linkage
                    const existingLinkage = editingTheme.linkages.pains.find(
                      (p) => p.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {pain.text || `Pain ${pain.id}`}
                        </Typography>
                        <Rating
                          name={`pain-rating-${linkageId}`}
                          value={existingLinkage ? existingLinkage.rating : 1}
                          onChange={(e, newVal) => {
                            console.log(`Pain ${pain.id} rated ${newVal} stars`);
                            setEditingTheme((prev) => {
                              // If rating is 1, remove the linkage
                              if (newVal === 1) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    pains: prev.linkages.pains.filter(
                                      (p) => p.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              // If linkage exists, update the rating
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    pains: prev.linkages.pains.map((p) =>
                                      p.linkageId === linkageId
                                        ? { ...p, rating: newVal }
                                        : p
                                    ),
                                  },
                                };
                              }
                              // Else, add the linkage
                              return {
                                ...prev,
                                linkages: {
                                  ...prev.linkages,
                                  pains: [
                                    ...prev.linkages.pains,
                                    { painId: pain.id, rating: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          sx={{ ml: 2 }}
                          aria-label={`Rating for Pain ${pain.id}`}
                        />
                      </Box>
                    );
                  })
                )}
              </AccordionDetails>
            </Accordion>

            {/* 2. Addressing Gains */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>2. Addressing Gains</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {gains.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No gains available to link.
                  </Typography>
                ) : (
                  gains.map((gain) => {
                    const linkageId = `gains-${gain.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.linkages.gains.find(
                      (g) => g.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {gain.text || `Gain ${gain.id}`}
                        </Typography>
                        <Rating
                          name={`gain-rating-${linkageId}`}
                          value={existingLinkage ? existingLinkage.rating : 1}
                          onChange={(e, newVal) => {
                            console.log(`Gain ${gain.id} rated ${newVal} stars`);
                            setEditingTheme((prev) => {
                              if (newVal === 1) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    gains: prev.linkages.gains.filter(
                                      (g) => g.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    gains: prev.linkages.gains.map((g) =>
                                      g.linkageId === linkageId
                                        ? { ...g, rating: newVal }
                                        : g
                                    ),
                                  },
                                };
                              }
                              return {
                                ...prev,
                                linkages: {
                                  ...prev.linkages,
                                  gains: [
                                    ...prev.linkages.gains,
                                    { gainId: gain.id, rating: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          sx={{ ml: 2 }}
                          aria-label={`Rating for Gain ${gain.id}`}
                        />
                      </Box>
                    );
                  })
                )}
              </AccordionDetails>
            </Accordion>

            {/* 3. Mapping to Evaluation Criteria */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>3. Mapping to Evaluation Criteria</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {evaluationCriteria.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No evaluation criteria available to map.
                  </Typography>
                ) : (
                  evaluationCriteria.map((criteria) => {
                    const linkageId = `evaluationCriteria-${criteria.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.linkages.evaluationCriteria.find(
                      (c) => c.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {criteria.text || `Criterion ${criteria.id}`}
                        </Typography>
                        <Rating
                          name={`criteria-rating-${linkageId}`}
                          value={existingLinkage ? existingLinkage.rating : 1}
                          onChange={(e, newVal) => {
                            console.log(`Criterion ${criteria.id} rated ${newVal} stars`);
                            setEditingTheme((prev) => {
                              if (newVal === 1) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    evaluationCriteria: prev.linkages.evaluationCriteria.filter(
                                      (c) => c.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    evaluationCriteria: prev.linkages.evaluationCriteria.map((c) =>
                                      c.linkageId === linkageId
                                        ? { ...c, rating: newVal }
                                        : c
                                    ),
                                  },
                                };
                              }
                              return {
                                ...prev,
                                linkages: {
                                  ...prev.linkages,
                                  evaluationCriteria: [
                                    ...prev.linkages.evaluationCriteria,
                                    { criterionId: criteria.id, rating: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          sx={{ ml: 2 }}
                          aria-label={`Rating for Evaluation Criterion ${criteria.id}`}
                        />
                      </Box>
                    );
                  })
                )}
              </AccordionDetails>
            </Accordion>

            {/* 4. Mapping to Client Objectives */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>4. Mapping to Client Objectives</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {clientObjectives.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No client objectives available to map.
                  </Typography>
                ) : (
                  clientObjectives.map((objective) => {
                    const linkageId = `clientContext-${objective.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.linkages.clientContext.find(
                      (c) => c.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {objective.text || `Objective ${objective.id}`}
                        </Typography>
                        <Rating
                          name={`clientContext-rating-${linkageId}`}
                          value={existingLinkage ? existingLinkage.rating : 1}
                          onChange={(e, newVal) => {
                            console.log(`Objective ${objective.id} rated ${newVal} stars`);
                            setEditingTheme((prev) => {
                              if (newVal === 1) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    clientContext: prev.linkages.clientContext.filter(
                                      (c) => c.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  linkages: {
                                    ...prev.linkages,
                                    clientContext: prev.linkages.clientContext.map((c) =>
                                      c.linkageId === linkageId
                                        ? { ...c, rating: newVal }
                                        : c
                                    ),
                                  },
                                };
                              }
                              return {
                                ...prev,
                                linkages: {
                                  ...prev.linkages,
                                  clientContext: [
                                    ...prev.linkages.clientContext,
                                    { contextId: objective.id, rating: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          sx={{ ml: 2 }}
                          aria-label={`Rating for Client Objective ${objective.id}`}
                        />
                      </Box>
                    );
                  })
                )}
              </AccordionDetails>
            </Accordion>

            {/* 5. SWOT Linkages */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>5. SWOT Linkages</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Strengths */}
                <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                  Strengths
                </Typography>
                {swot.strengths.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No strengths available to link.
                  </Typography>
                ) : (
                  swot.strengths.map((strength) => {
                    const linkageId = `strengths-${strength.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.swotLinkages.strengths.find(
                      (s) => s.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {strength.text || `Strength ${strength.id}`}
                        </Typography>
                        <Slider
                          value={existingLinkage ? existingLinkage.coverageScore : 100}
                          onChange={(e, newVal) => {
                            console.log(`Strength ${strength.id} coverage set to ${newVal}%`);
                            setEditingTheme((prev) => {
                              if (newVal === 100) {
                                // Remove the linkage if coverage is 100%
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    strengths: prev.swotLinkages.strengths.filter(
                                      (s) => s.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              // If linkage exists, update the coverage score
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    strengths: prev.swotLinkages.strengths.map((s) =>
                                      s.linkageId === linkageId
                                        ? { ...s, coverageScore: newVal }
                                        : s
                                    ),
                                  },
                                };
                              }
                              // Else, add the linkage
                              return {
                                ...prev,
                                swotLinkages: {
                                  ...prev.swotLinkages,
                                  strengths: [
                                    ...prev.swotLinkages.strengths,
                                    { id: strength.id, coverageScore: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          aria-labelledby="coverage-slider"
                          step={10}
                          marks={coverageMarks}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                          sx={{ width: 200, ml: 2 }}
                        />
                      </Box>
                    );
                  })
                )}

                {/* Weaknesses */}
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Weaknesses
                </Typography>
                {swot.weaknesses.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No weaknesses available to link.
                  </Typography>
                ) : (
                  swot.weaknesses.map((weakness) => {
                    const linkageId = `weaknesses-${weakness.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.swotLinkages.weaknesses.find(
                      (w) => w.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {weakness.text || `Weakness ${weakness.id}`}
                        </Typography>
                        <Slider
                          value={existingLinkage ? existingLinkage.coverageScore : 100}
                          onChange={(e, newVal) => {
                            console.log(`Weakness ${weakness.id} coverage set to ${newVal}%`);
                            setEditingTheme((prev) => {
                              if (newVal === 100) {
                                // Remove the linkage if coverage is 100%
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    weaknesses: prev.swotLinkages.weaknesses.filter(
                                      (w) => w.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              // If linkage exists, update the coverage score
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    weaknesses: prev.swotLinkages.weaknesses.map((w) =>
                                      w.linkageId === linkageId
                                        ? { ...w, coverageScore: newVal }
                                        : w
                                    ),
                                  },
                                };
                              }
                              // Else, add the linkage
                              return {
                                ...prev,
                                swotLinkages: {
                                  ...prev.swotLinkages,
                                  weaknesses: [
                                    ...prev.swotLinkages.weaknesses,
                                    { id: weakness.id, coverageScore: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          aria-labelledby="coverage-slider"
                          step={10}
                          marks={coverageMarks}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                          sx={{ width: 200, ml: 2 }}
                        />
                      </Box>
                    );
                  })
                )}

                {/* Opportunities */}
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Opportunities
                </Typography>
                {swot.opportunities.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No opportunities available to link.
                  </Typography>
                ) : (
                  swot.opportunities.map((opportunity) => {
                    const linkageId = `opportunities-${opportunity.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.swotLinkages.opportunities.find(
                      (o) => o.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {opportunity.text || `Opportunity ${opportunity.id}`}
                        </Typography>
                        <Slider
                          value={existingLinkage ? existingLinkage.coverageScore : 100}
                          onChange={(e, newVal) => {
                            console.log(`Opportunity ${opportunity.id} coverage set to ${newVal}%`);
                            setEditingTheme((prev) => {
                              if (newVal === 100) {
                                // Remove the linkage if coverage is 100%
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    opportunities: prev.swotLinkages.opportunities.filter(
                                      (o) => o.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              // If linkage exists, update the coverage score
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    opportunities: prev.swotLinkages.opportunities.map((o) =>
                                      o.linkageId === linkageId
                                        ? { ...o, coverageScore: newVal }
                                        : o
                                    ),
                                  },
                                };
                              }
                              // Else, add the linkage
                              return {
                                ...prev,
                                swotLinkages: {
                                  ...prev.swotLinkages,
                                  opportunities: [
                                    ...prev.swotLinkages.opportunities,
                                    { id: opportunity.id, coverageScore: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          aria-labelledby="coverage-slider"
                          step={10}
                          marks={coverageMarks}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                          sx={{ width: 200, ml: 2 }}
                        />
                      </Box>
                    );
                  })
                )}

                {/* Threats */}
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  Threats
                </Typography>
                {swot.threats.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No threats available to link.
                  </Typography>
                ) : (
                  swot.threats.map((threat) => {
                    const linkageId = `threats-${threat.id}`; // Deterministic linkageId
                    const existingLinkage = editingTheme.swotLinkages.threats.find(
                      (t) => t.linkageId === linkageId
                    );
                    return (
                      <Box
                        key={linkageId}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ minWidth: 150 }}>
                          {threat.text || `Threat ${threat.id}`}
                        </Typography>
                        <Slider
                          value={existingLinkage ? existingLinkage.coverageScore : 100}
                          onChange={(e, newVal) => {
                            console.log(`Threat ${threat.id} coverage set to ${newVal}%`);
                            setEditingTheme((prev) => {
                              if (newVal === 100) {
                                // Remove the linkage if coverage is 100%
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    threats: prev.swotLinkages.threats.filter(
                                      (t) => t.linkageId !== linkageId
                                    ),
                                  },
                                };
                              }
                              // If linkage exists, update the coverage score
                              if (existingLinkage) {
                                return {
                                  ...prev,
                                  swotLinkages: {
                                    ...prev.swotLinkages,
                                    threats: prev.swotLinkages.threats.map((t) =>
                                      t.linkageId === linkageId
                                        ? { ...t, coverageScore: newVal }
                                        : t
                                    ),
                                  },
                                };
                              }
                              // Else, add the linkage
                              return {
                                ...prev,
                                swotLinkages: {
                                  ...prev.swotLinkages,
                                  threats: [
                                    ...prev.swotLinkages.threats,
                                    { id: threat.id, coverageScore: newVal, linkageId },
                                  ],
                                },
                              };
                            });
                          }}
                          aria-labelledby="coverage-slider"
                          step={10}
                          marks={coverageMarks}
                          min={0}
                          max={100}
                          valueLabelDisplay="auto"
                          sx={{ width: 200, ml: 2 }}
                        />
                      </Box>
                    );
                  })
                )}
              </AccordionDetails>
            </Accordion>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveTheme} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for User Feedback */}
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
    </Box>
  );
}