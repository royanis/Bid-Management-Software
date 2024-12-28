// src/components/workshop/steps/PainGainStep.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  TextField,
  Button,
  Stack,
  Grid,
  Divider,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CommentIcon from '@mui/icons-material/Comment';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useBidContext } from '../../../context/BidContext';
import { v4 as uuidv4 } from 'uuid';
import Joyride from 'react-joyride';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Brush,
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkshopContext } from '../../../context/WorkshopContext';
import 'react-resizable/css/styles.css';

// Helper function to reorder items
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// Function to determine quadrant based on votes and impactScore
const determineQuadrant = (votes, impactScore, midVotes, midImpact) => {
  if (votes >= midVotes && impactScore >= midImpact) return 'Q1';
  if (votes < midVotes && impactScore >= midImpact) return 'Q2';
  if (votes >= midVotes && impactScore < midImpact) return 'Q3';
  return 'Q4';
};

// Color scale for quadrants
const quadrantColors = {
  Q1: 'rgba(211, 47, 47, 0.3)', // Semi-transparent Red
  Q2: 'rgba(245, 124, 0, 0.3)', // Semi-transparent Orange
  Q3: 'rgba(25, 118, 210, 0.3)', // Semi-transparent Blue
  Q4: 'rgba(56, 142, 60, 0.3)', // Semi-transparent Green
};

// Distinct colors for data points to ensure visibility
const dataPointColors = {
  Pain: '#D32F2F', // Red
  Gain: '#1976D2', // Blue
};

const PainGainStep = () => {
  const { bidId } = useParams();
  const { bidData, setBidData } = useBidContext();
  const navigate = useNavigate();
  const { setActiveStep } = useWorkshopContext();

  // Snackbar State for Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Initialize Pains with unique IDs, preserving existing ones
  const initialPains = useMemo(() => {
    return Array.isArray(bidData?.workshop?.pains)
      ? bidData.workshop.pains.map((pain) => ({
          id: pain.id || uuidv4(), // Preserve existing ID or generate a new one
          text: pain.text || pain, // Adjust based on data structure
          votes: pain.votes || 0,
          comment: pain.comment || '',
          impactScore: pain.impactScore || 0,
        }))
      : [];
  }, [bidData.workshop.pains]);

  // Initialize Gains with unique IDs, preserving existing ones
  const initialGains = useMemo(() => {
    return Array.isArray(bidData?.workshop?.gains)
      ? bidData.workshop.gains.map((gain) => ({
          id: gain.id || uuidv4(), // Preserve existing ID or generate a new one
          text: gain.text || gain, // Adjust based on data structure
          votes: gain.votes || 0,
          comment: gain.comment || '',
          impactScore: gain.impactScore || 0,
        }))
      : [];
  }, [bidData.workshop.gains]);

  const [pains, setPains] = useState(initialPains);
  const [gains, setGains] = useState(initialGains);
  const [newPain, setNewPain] = useState('');
  const [newGain, setNewGain] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [commentDialog, setCommentDialog] = useState({ open: false, type: '', id: '', comment: '' });
  const [runTour, setRunTour] = useState(true);
  const [finalizeDialog, setFinalizeDialog] = useState(false);

  // State for Sliders with default [0,10] and max 25
  const [xAxisRangePains, setXAxisRangePains] = useState([0, 10]);
  const [xAxisRangeGains, setXAxisRangeGains] = useState([0, 10]);

  // Handler for Pains Slider
  const handlePainSliderChange = (event, newValue) => {
    setXAxisRangePains(newValue);
  };

  // Handler for Gains Slider
  const handleGainSliderChange = (event, newValue) => {
    setXAxisRangeGains(newValue);
  };

  // Set active step to 1 when component mounts
  useEffect(() => {
    setActiveStep(1); // "Pains & Gains" is step index 1
  }, [setActiveStep]);

  // Update the bidData whenever pains or gains change
  useEffect(() => {
    const painData = pains.map((p) => ({
      id: p.id, // Include the unique ID
      text: p.text,
      votes: p.votes,
      comment: p.comment,
      impactScore: p.impactScore,
    }));
    const gainData = gains.map((g) => ({
      id: g.id, // Include the unique ID
      text: g.text,
      votes: g.votes,
      comment: g.comment,
      impactScore: g.impactScore,
    }));
    setBidData((prev) => ({
      ...prev,
      workshop: {
        ...prev.workshop,
        pains: painData,
        gains: gainData,
        // Retain existing finalizedPains and finalizedGains
        finalizedPains: prev.workshop.finalizedPains || [],
        finalizedGains: prev.workshop.finalizedGains || [],
      },
    }));
  }, [pains, gains, setBidData]);

  // Handlers for adding Pains and Gains
  const handleAddPain = () => {
    if (newPain.trim()) {
      // Check for duplicates
      if (pains.some((p) => p.text.toLowerCase() === newPain.trim().toLowerCase())) {
        setSnackbar({ open: true, message: 'This pain point already exists.', severity: 'error' });
        return;
      }
      setPains([
        ...pains,
        { id: uuidv4(), text: newPain.trim(), votes: 0, comment: '', impactScore: 0 },
      ]);
      setNewPain('');
      setSnackbar({ open: true, message: 'Pain added successfully!', severity: 'success' });
    }
  };

  const handleAddGain = () => {
    if (newGain.trim()) {
      // Check for duplicates
      if (gains.some((g) => g.text.toLowerCase() === newGain.trim().toLowerCase())) {
        setSnackbar({ open: true, message: 'This gain already exists.', severity: 'error' });
        return;
      }
      setGains([
        ...gains,
        { id: uuidv4(), text: newGain.trim(), votes: 0, comment: '', impactScore: 0 },
      ]);
      setNewGain('');
      setSnackbar({ open: true, message: 'Gain added successfully!', severity: 'success' });
    }
  };

  // Handlers for editing items
  const handleEditItem = (type, id, currentText) => {
    setEditingItem({ type, id, text: currentText });
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      const { type, id, text } = editingItem;
      if (text.trim() === '') {
        setSnackbar({ open: true, message: 'Text cannot be empty.', severity: 'error' });
        return;
      }
      if (type === 'pain') {
        setPains(
          pains.map((p) => (p.id === id ? { ...p, text: text.trim() } : p))
        );
      } else if (type === 'gain') {
        setGains(
          gains.map((g) => (g.id === id ? { ...g, text: text.trim() } : g))
        );
      }
      setEditingItem(null);
      setSnackbar({ open: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} edited successfully!`, severity: 'success' });
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  // Handlers for deleting items
  const handleDeleteItem = (type, id) => {
    const confirmation = window.confirm(`Are you sure you want to delete this ${type}?`);
    if (confirmation) {
      if (type === 'pain') {
        setPains(pains.filter((p) => p.id !== id));
      } else if (type === 'gain') {
        setGains(gains.filter((g) => g.id !== id));
      }
      setSnackbar({ open: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`, severity: 'info' });
    }
  };

  // Handlers for voting
  const handleVote = (type, id, delta) => {
    if (type === 'pain') {
      const updatedPains = pains.map((p) => {
        if (p.id === id) {
          const newVotes = p.votes + delta;
          if (newVotes > 25) {
            setSnackbar({ open: true, message: 'Votes cannot exceed 25.', severity: 'warning' });
            return { ...p, votes: 25 };
          }
          if (newVotes < 0) {
            setSnackbar({ open: true, message: 'Votes cannot be negative.', severity: 'warning' });
            return { ...p, votes: 0 };
          }
          return { ...p, votes: newVotes };
        }
        return p;
      });
      setPains(updatedPains);
    } else {
      const updatedGains = gains.map((g) => {
        if (g.id === id) {
          const newVotes = g.votes + delta;
          if (newVotes > 25) {
            setSnackbar({ open: true, message: 'Votes cannot exceed 25.', severity: 'warning' });
            return { ...g, votes: 25 };
          }
          if (newVotes < 0) {
            setSnackbar({ open: true, message: 'Votes cannot be negative.', severity: 'warning' });
            return { ...g, votes: 0 };
          }
          return { ...g, votes: newVotes };
        }
        return g;
      });
      setGains(updatedGains);
    }
  };

  // Handlers for comments
  const handleAddComment = (type, id) => {
    const item = type === 'pain' ? pains.find((p) => p.id === id) : gains.find((g) => g.id === id);
    setCommentDialog({ open: true, type, id, comment: item.comment || '' });
  };

  const handleSaveComment = () => {
    const { type, id, comment } = commentDialog;
    if (type === 'pain') {
      setPains(
        pains.map((p) => (p.id === id ? { ...p, comment: comment.trim() } : p))
      );
    } else {
      setGains(
        gains.map((g) => (g.id === id ? { ...g, comment: comment.trim() } : g))
      );
    }
    setCommentDialog({ open: false, type: '', id: '', comment: '' });
    setSnackbar({ open: true, message: 'Comment added successfully!', severity: 'success' });
  };

  const handleCancelComment = () => {
    setCommentDialog({ open: false, type: '', id: '', comment: '' });
  };

  // Handlers for Impact Score assignment
  const handleImpactScoreChange = (type, id, value) => {
    const score = parseInt(value, 10);
    if (isNaN(score) || score < 1 || score > 10) {
      setSnackbar({ open: true, message: 'Impact Score must be between 1 and 10.', severity: 'error' });
      return;
    }
    if (type === 'pain') {
      setPains(
        pains.map((p) => (p.id === id ? { ...p, impactScore: score } : p))
      );
    } else {
      setGains(
        gains.map((g) => (g.id === id ? { ...g, impactScore: score } : g))
      );
    }
  };

  // Unified onDragEnd handler
  const handleDragEnd = (result) => {
    const { source, destination } = result;

    // Dropped outside the list
    if (!destination) return;

    // Reordering within the same list
    if (source.droppableId === destination.droppableId) {
      const items = source.droppableId === 'pains-droppable' ? pains : gains;
      const reorderedItems = reorder(items, source.index, destination.index);
      if (source.droppableId === 'pains-droppable') {
        setPains(reorderedItems);
      } else {
        setGains(reorderedItems);
      }
    }
  };

  // Handlers for navigation
  const handleNextClick = () => {
    setFinalizeDialog(true);
  };

  // State to track selected Pains and Gains
  const [selectedPains, setSelectedPains] = useState([]);
  const [selectedGains, setSelectedGains] = useState([]);

  // Handler for selecting/deselecting Pains
  const handleSelectPain = (id) => {
    setSelectedPains((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handler for selecting/deselecting Gains
  const handleSelectGain = (id) => {
    setSelectedGains((prev) => {
      if (prev.includes(id)) {
        return prev.filter((gid) => gid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handler for selecting/deselecting all Pains
  const handleSelectAllPains = () => {
    if (selectedPains.length === pains.length) {
      setSelectedPains([]);
    } else {
      setSelectedPains(pains.map((p) => p.id));
    }
  };

  // Handler for selecting/deselecting all Gains
  const handleSelectAllGains = () => {
    if (selectedGains.length === gains.length) {
      setSelectedGains([]);
    } else {
      setSelectedGains(gains.map((g) => g.id));
    }
  };

  const handleFinalize = () => {
    // Ensure at least one Pain and one Gain is selected
    if (selectedPains.length === 0 || selectedGains.length === 0) {
      setSnackbar({ open: true, message: 'Please select at least one Pain and one Gain to proceed.', severity: 'error' });
      return;
    }

    // Construct finalized pains and gains
    const finalizedPains = pains
      .filter((p) => selectedPains.includes(p.id))
      .map((p) => ({
        id: p.id,
        text: p.text,
        votes: p.votes,
        comment: p.comment,
        impactScore: p.impactScore,
      }));

    const finalizedGains = gains
      .filter((g) => selectedGains.includes(g.id))
      .map((g) => ({
        id: g.id,
        text: g.text,
        votes: g.votes,
        comment: g.comment,
        impactScore: g.impactScore,
      }));

    // Update bidData with finalizedPains and finalizedGains
    setBidData((prev) => ({
      ...prev,
      workshop: {
        ...prev.workshop,
        finalizedPains,
        finalizedGains,
      },
    }));

    setFinalizeDialog(false);
    setSnackbar({ open: true, message: 'Pains and Gains finalized successfully!', severity: 'success' });
    navigate(`/win-theme-workshop/${bidId}/swot`); // Replace with actual next step path
  };

  const handleCancelFinalize = () => {
    setFinalizeDialog(false);
  };

  // Progress Steps for Joyride
  const joyrideSteps = [
    {
      target: '.pains-section',
      content: 'Add and prioritize client pains here. Click "Add" to include a new pain point.',
    },
    {
      target: '.gains-section',
      content: 'Add and prioritize client gains here. Click "Add" to include a new gain.',
    },
    {
      target: '.add-pain-button',
      content: 'Click here to add a new pain point. Press Enter after typing.',
    },
    {
      target: '.add-gain-button',
      content: 'Click here to add a new gain. Press Enter after typing.',
    },
    {
      target: '.impact-score-input',
      content: 'Assign an Impact Score (1-10) to each Pain or Gain. This helps in analyzing their significance.',
    },
    {
      target: '.next-button',
      content: 'Once you have added Pains and Gains, click Next to proceed.',
    },
  ];

  // Prepare data for Scatter Charts
  const combinedPainsData = useMemo(
    () => [...pains.map((item) => ({ ...item, type: 'Pain' }))],
    [pains]
  );

  const combinedGainsData = useMemo(
    () => [...gains.map((item) => ({ ...item, type: 'Gain' }))],
    [gains]
  );

  // Calculate dynamic axis ranges for Pains
  const maxImpactPains = useMemo(() => {
    const allImpact = combinedPainsData.map((item) => item.impactScore);
    return Math.max(...allImpact, 10); // Ensure at least 10
  }, [combinedPainsData]);

  const midVotesPains = useMemo(
    () => (xAxisRangePains[0] + xAxisRangePains[1]) / 2,
    [xAxisRangePains]
  );
  const midImpactPains = useMemo(
    () => Math.ceil(maxImpactPains / 2),
    [maxImpactPains]
  );

  // Calculate dynamic axis ranges for Gains
  const maxImpactGains = useMemo(() => {
    const allImpact = combinedGainsData.map((item) => item.impactScore);
    return Math.max(...allImpact, 10); // Ensure at least 10
  }, [combinedGainsData]);

  const midVotesGains = useMemo(
    () => (xAxisRangeGains[0] + xAxisRangeGains[1]) / 2,
    [xAxisRangeGains]
  );
  const midImpactGains = useMemo(
    () => Math.ceil(maxImpactGains / 2),
    [maxImpactGains]
  );

  // Heatmap Data for Pains
  const heatmapDataPains = useMemo(
    () =>
      combinedPainsData.map((item) => ({
        name: item.text,
        votes: item.votes,
        impactScore: item.impactScore,
        type: item.type,
        quadrant: determineQuadrant(item.votes, item.impactScore, midVotesPains, midImpactPains),
      })),
    [combinedPainsData, midVotesPains, midImpactPains]
  );

  // Heatmap Data for Gains
  const heatmapDataGains = useMemo(
    () =>
      combinedGainsData.map((item) => ({
        name: item.text,
        votes: item.votes,
        impactScore: item.impactScore,
        type: item.type,
        quadrant: determineQuadrant(item.votes, item.impactScore, midVotesGains, midImpactGains),
      })),
    [combinedGainsData, midVotesGains, midImpactGains]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/*
        1) Joyride for interactive tutorials
      */}
      <Joyride
        steps={joyrideSteps}
        continuous
        showSkipButton
        run={runTour}
        styles={{
          options: {
            zIndex: 10000,
          },
        }}
        callback={(data) => {
          const { status } = data;
          if (status === 'finished' || status === 'skipped') {
            setRunTour(false);
          }
        }}
      />

      {/*
        2) Snackbar for User Feedback
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
        3) Header with consistent styling
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
        Map Pains and Gains
      </Typography>

      {/*
        4) Step Indicator and Progress Bar
      */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Step 2 of 6
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Typography>
              1. Client Context <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography sx={{ fontWeight: 'bold' }}>2. Pains & Gains</Typography>
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
          <LinearProgress variant="determinate" value={(2 / 6) * 100} />
        </Box>
      </Box>

      {/*
        5) Step Description
      */}
      <Typography
        variant="body1"
        color="textSecondary"
        sx={{ textAlign: 'center', mb: 3 }}
      >
        Identify the client's key challenges and opportunities. Prioritize them to focus on the most impactful areas.
      </Typography>

      {/*
        6) Drag and Drop Context
      */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {/* Pains Section */}
          <Grid item xs={12} md={6} className="pains-section">
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>Pains</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                What are the client's pressing challenges, issues, or problems?
                Drag and drop to prioritize.
              </Typography>

              {/* Drag and Drop for Pains */}
              <Droppable droppableId="pains-droppable">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 100,
                      backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : '#fff',
                      padding: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {pains.length === 0 && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        No pains added yet. Add one below.
                      </Typography>
                    )}
                    {pains.map((pain, index) => (
                      <Draggable key={pain.id} draggableId={pain.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              mb: 1,
                              p: 2,
                              backgroundColor: snapshot.isDragging ? '#bbdefb' : '#ffffff',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography>{pain.text}</Typography>
                              <Box>
                                <IconButton
                                  aria-label="upvote pain"
                                  size="small"
                                  onClick={() => handleVote('pain', pain.id, 1)}
                                >
                                  <ThumbUpIcon fontSize="inherit" />
                                </IconButton>
                                <Typography variant="body2" component="span">{pain.votes}</Typography>
                                <IconButton
                                  aria-label="downvote pain"
                                  size="small"
                                  onClick={() => handleVote('pain', pain.id, -1)}
                                >
                                  <ThumbDownIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                  aria-label="comment pain"
                                  size="small"
                                  onClick={() => handleAddComment('pain', pain.id)}
                                >
                                  <CommentIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                  aria-label="edit pain"
                                  size="small"
                                  onClick={() => handleEditItem('pain', pain.id, pain.text)}
                                >
                                  <EditIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                  aria-label="delete pain"
                                  size="small"
                                  onClick={() => handleDeleteItem('pain', pain.id)}
                                >
                                  <DeleteIcon fontSize="inherit" />
                                </IconButton>
                              </Box>
                            </Box>

                            {/* Impact Score Assignment */}
                            <TextField
                              label="Impact Score (1-10)"
                              type="number"
                              InputProps={{ inputProps: { min: 1, max: 10 } }}
                              variant="outlined"
                              size="small"
                              fullWidth
                              sx={{ mt: 1 }}
                              value={pain.impactScore}
                              onChange={(e) => handleImpactScoreChange('pain', pain.id, e.target.value)}
                              className="impact-score-input"
                              aria-label={`Assign Impact Score for Pain: ${pain.text}`}
                            />

                            {pain.comment && (
                              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                                {pain.comment}
                              </Typography>
                            )}
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>

              {/* Add New Pain */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }} className="add-pain-button">
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Add a pain point..."
                  value={newPain}
                  onChange={(e) => setNewPain(e.target.value)}
                  fullWidth
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPain();
                    }
                  }}
                  error={false} // Placeholder for validation
                  helperText={!newPain.trim() ? 'Press Enter or click Add.' : ''}
                  aria-label="Add a custom pain point"
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddPain}
                  disabled={!newPain.trim()}
                  aria-label="Add Pain"
                >
                  Add
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Gains Section */}
          <Grid item xs={12} md={6} className="gains-section">
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>Gains</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                What opportunities or improvements does the client seek? What are their aspirations?
                Drag and drop to prioritize.
              </Typography>

              {/* Drag and Drop for Gains */}
              <Droppable droppableId="gains-droppable">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 100,
                      backgroundColor: snapshot.isDraggingOver ? '#c8e6c9' : '#fff',
                      padding: 1,
                      borderRadius: 1,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    {gains.length === 0 && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        No gains added yet. Add one below.
                      </Typography>
                    )}
                    {gains.map((gain, index) => (
                      <Draggable key={gain.id} draggableId={gain.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              mb: 1,
                              p: 2,
                              backgroundColor: snapshot.isDragging ? '#a5d6a7' : '#ffffff',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography>{gain.text}</Typography>
                              <Box>
                                <IconButton
                                  aria-label="upvote gain"
                                  size="small"
                                  onClick={() => handleVote('gain', gain.id, 1)}
                                >
                                  <ThumbUpIcon fontSize="inherit" />
                                </IconButton>
                                <Typography variant="body2" component="span">{gain.votes}</Typography>
                                <IconButton
                                  aria-label="downvote gain"
                                  size="small"
                                  onClick={() => handleVote('gain', gain.id, -1)}
                                >
                                  <ThumbDownIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                  aria-label="comment gain"
                                  size="small"
                                  onClick={() => handleAddComment('gain', gain.id)}
                                >
                                  <CommentIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                  aria-label="edit gain"
                                  size="small"
                                  onClick={() => handleEditItem('gain', gain.id, gain.text)}
                                >
                                  <EditIcon fontSize="inherit" />
                                </IconButton>
                                <IconButton
                                  aria-label="delete gain"
                                  size="small"
                                  onClick={() => handleDeleteItem('gain', gain.id)}
                                >
                                  <DeleteIcon fontSize="inherit" />
                                </IconButton>
                              </Box>
                            </Box>

                            {/* Impact Score Assignment */}
                            <TextField
                              label="Impact Score (1-10)"
                              type="number"
                              InputProps={{ inputProps: { min: 1, max: 10 } }}
                              variant="outlined"
                              size="small"
                              fullWidth
                              sx={{ mt: 1 }}
                              value={gain.impactScore}
                              onChange={(e) => handleImpactScoreChange('gain', gain.id, e.target.value)}
                              className="impact-score-input"
                              aria-label={`Assign Impact Score for Gain: ${gain.text}`}
                            />

                            {gain.comment && (
                              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                                {gain.comment}
                              </Typography>
                            )}
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>

              {/* Add New Gain */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }} className="add-gain-button">
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Add a desired gain..."
                  value={newGain}
                  onChange={(e) => setNewGain(e.target.value)}
                  fullWidth
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGain();
                    }
                  }}
                  error={false} // Placeholder for validation
                  helperText={!newGain.trim() ? 'Press Enter or click Add.' : ''}
                  aria-label="Add a custom gain"
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddGain}
                  disabled={!newGain.trim()}
                  aria-label="Add Gain"
                >
                  Add
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DragDropContext>

      {/*
        7) Data Visualization
      */}
      <Grid container spacing={2}>
        {/* Pains Scatter Chart */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, backgroundColor: '#fafafa', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Pains: Votes vs Impact Score</Typography>
            {combinedPainsData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                  >
                    {/* Reference Areas for Quadrants */}
                    <ReferenceArea x1={0} x2={midVotesPains} y1={midImpactPains} y2={maxImpactPains} fill={quadrantColors.Q2} />
                    <ReferenceArea x1={midVotesPains} x2={xAxisRangePains[1]} y1={midImpactPains} y2={maxImpactPains} fill={quadrantColors.Q1} />
                    <ReferenceArea x1={0} x2={midVotesPains} y1={0} y2={midImpactPains} fill={quadrantColors.Q4} />
                    <ReferenceArea x1={midVotesPains} x2={xAxisRangePains[1]} y1={0} y2={midImpactPains} fill={quadrantColors.Q3} />

                    {/* Reference Lines for Quadrants */}
                    <ReferenceLine x={midVotesPains} stroke="#000" strokeDasharray="4 4" />
                    <ReferenceLine y={midImpactPains} stroke="#000" strokeDasharray="4 4" />

                    {/* Axes with Dynamic Domains */}
                    <XAxis
                      type="number"
                      dataKey="votes"
                      name="Votes"
                      label={{ value: 'Number of Votes', position: 'insideBottomRight', offset: -10 }}
                      domain={xAxisRangePains}
                      ticks={[xAxisRangePains[0], midVotesPains, xAxisRangePains[1]]}
                    />
                    <YAxis
                      type="number"
                      dataKey="impactScore"
                      name="Impact Score"
                      label={{ value: 'Impact Score', angle: -90, position: 'insideLeft', offset: 0 }}
                      domain={[0, maxImpactPains + 1]}
                      ticks={[0, midImpactPains, maxImpactPains]}
                    />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />

                    {/* Scatter Plot for Pains */}
                    <Scatter name="Pains" data={heatmapDataPains} fill={dataPointColors.Pain}>
                      {heatmapDataPains.map((entry, index) => (
                        <Cell key={`cell-pain-${index}`} fill={dataPointColors.Pain} />
                      ))}
                      <LabelList dataKey="name" position="top" />
                    </Scatter>

                    {/* Brush Component */}
                    <Brush
                      dataKey="votes"
                      height={30}
                      stroke="#8884d8"
                      startIndex={0}
                      endIndex={Math.min(combinedPainsData.length, 10)}
                      travellerWidth={10}
                      fill="rgba(136,132,216,0.2)"
                      handleSize={10}
                      aria-label="Pain Brush"
                    />
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Slider for Pains X-Axis */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Adjust X-Axis Range (Votes):
                  </Typography>
                  <Slider
                    value={xAxisRangePains}
                    onChange={handlePainSliderChange}
                    valueLabelDisplay="auto"
                    min={0}
                    max={25}
                    step={1}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 10, label: '10' },
                      { value: 25, label: '25' },
                    ]}
                    aria-labelledby="pain-x-axis-slider"
                  />
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">No pains data to display.</Typography>
            )}
          </Paper>
        </Grid>

        {/* Gains Scatter Chart */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, backgroundColor: '#fafafa', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Gains: Votes vs Impact Score</Typography>
            {combinedGainsData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                  >
                    {/* Reference Areas for Quadrants */}
                    <ReferenceArea x1={0} x2={midVotesGains} y1={midImpactGains} y2={maxImpactGains} fill={quadrantColors.Q2} />
                    <ReferenceArea x1={midVotesGains} x2={xAxisRangeGains[1]} y1={midImpactGains} y2={maxImpactGains} fill={quadrantColors.Q1} />
                    <ReferenceArea x1={0} x2={midVotesGains} y1={0} y2={midImpactGains} fill={quadrantColors.Q4} />
                    <ReferenceArea x1={midVotesGains} x2={xAxisRangeGains[1]} y1={0} y2={midImpactGains} fill={quadrantColors.Q3} />

                    {/* Reference Lines for Quadrants */}
                    <ReferenceLine x={midVotesGains} stroke="#000" strokeDasharray="4 4" />
                    <ReferenceLine y={midImpactGains} stroke="#000" strokeDasharray="4 4" />

                    {/* Axes with Dynamic Domains */}
                    <XAxis
                      type="number"
                      dataKey="votes"
                      name="Votes"
                      label={{ value: 'Number of Votes', position: 'insideBottomRight', offset: -10 }}
                      domain={xAxisRangeGains}
                      ticks={[xAxisRangeGains[0], midVotesGains, xAxisRangeGains[1]]}
                    />
                    <YAxis
                      type="number"
                      dataKey="impactScore"
                      name="Impact Score"
                      label={{ value: 'Impact Score', angle: -90, position: 'insideLeft', offset: 0 }}
                      domain={[0, maxImpactGains + 1]}
                      ticks={[0, midImpactGains, maxImpactGains]}
                    />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />

                    {/* Scatter Plot for Gains */}
                    <Scatter name="Gains" data={heatmapDataGains} fill={dataPointColors.Gain}>
                      {heatmapDataGains.map((entry, index) => (
                        <Cell key={`cell-gain-${index}`} fill={dataPointColors.Gain} />
                      ))}
                      <LabelList dataKey="name" position="top" />
                    </Scatter>

                    {/* Brush Component */}
                    <Brush
                      dataKey="votes"
                      height={30}
                      stroke="#82ca9d"
                      startIndex={0}
                      endIndex={Math.min(combinedGainsData.length, 10)}
                      travellerWidth={10}
                      fill="rgba(130,202,157,0.2)"
                      handleSize={10}
                      aria-label="Gain Brush"
                    />
                  </ScatterChart>
                </ResponsiveContainer>

                {/* Slider for Gains X-Axis */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Adjust X-Axis Range (Votes):
                  </Typography>
                  <Slider
                    value={xAxisRangeGains}
                    onChange={handleGainSliderChange}
                    valueLabelDisplay="auto"
                    min={0}
                    max={25}
                    step={1}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 10, label: '10' },
                      { value: 25, label: '25' },
                    ]}
                    aria-labelledby="gain-x-axis-slider"
                  />
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">No gains data to display.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/*
        8) Divider for Separation
      */}
      <Divider sx={{ my: 3 }} />

      {/*
        9) Navigation Buttons with consistent styling
      */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate(`/win-theme-workshop/${bidId}/client-context`)} // Corrected path
            aria-label="Previous Step"
          >
            Previous
          </Button>
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleNextClick}
          className="next-button"
          aria-label="Next Step"
        >
          Next
        </Button>
      </Box>

      {/*
        10) Edit Dialog
      */}
      <Dialog open={Boolean(editingItem)} onClose={handleCancelEdit}>
        <DialogTitle>Edit {editingItem?.type === 'pain' ? 'Pain' : 'Gain'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Text"
            type="text"
            fullWidth
            variant="outlined"
            value={editingItem?.text || ''}
            onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveEdit();
              }
            }}
            aria-label={`Edit ${editingItem?.type === 'pain' ? 'Pain' : 'Gain'}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} color="secondary" aria-label="Cancel Edit">
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} color="primary" disabled={editingItem?.text.trim() === ''} aria-label="Save Edit">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/*
        11) Comment Dialog
      */}
      <Dialog open={commentDialog.open} onClose={handleCancelComment}>
        <DialogTitle>Add Comment</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            type="text"
            fullWidth
            variant="outlined"
            value={commentDialog.comment}
            onChange={(e) => setCommentDialog({ ...commentDialog, comment: e.target.value })}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveComment();
              }
            }}
            aria-label="Add Comment"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelComment} color="secondary" aria-label="Cancel Comment">
            Cancel
          </Button>
          <Button onClick={handleSaveComment} color="primary" disabled={commentDialog.comment.trim() === ''} aria-label="Save Comment">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/*
        12) Finalize Dialog
      */}
      <Dialog
        open={finalizeDialog}
        onClose={handleCancelFinalize}
        fullWidth
        maxWidth="md"
        aria-labelledby="finalize-dialog-title"
      >
        <DialogTitle id="finalize-dialog-title">Finalize Pains and Gains</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Please review and select the Pains and Gains you want to carry forward to the next step.
          </Typography>

          {/* Selection for Pains */}
          <Typography variant="h6">Pains:</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedPains.length === pains.length && pains.length > 0}
                  onChange={handleSelectAllPains}
                  aria-label="Select All Pains"
                />
              }
              label="Select All"
            />
            {pains.map((pain) => (
              <FormControlLabel
                key={pain.id}
                control={
                  <Checkbox
                    checked={selectedPains.includes(pain.id)}
                    onChange={() => handleSelectPain(pain.id)}
                    aria-label={`Select Pain: ${pain.text}`}
                  />
                }
                label={`${pain.text} (Votes: ${pain.votes}, Impact: ${pain.impactScore})`}
              />
            ))}
          </FormGroup>

          {/* Selection for Gains */}
          <Typography variant="h6" sx={{ mt: 3 }}>Gains:</Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedGains.length === gains.length && gains.length > 0}
                  onChange={handleSelectAllGains}
                  aria-label="Select All Gains"
                />
              }
              label="Select All"
            />
            {gains.map((gain) => (
              <FormControlLabel
                key={gain.id}
                control={
                  <Checkbox
                    checked={selectedGains.includes(gain.id)}
                    onChange={() => handleSelectGain(gain.id)}
                    aria-label={`Select Gain: ${gain.text}`}
                  />
                }
                label={`${gain.text} (Votes: ${gain.votes}, Impact: ${gain.impactScore})`}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelFinalize} color="secondary" aria-label="Cancel Finalization">
            Cancel
          </Button>
          <Button onClick={handleFinalize} color="primary" aria-label="Finalize and Proceed">
            Finalize and Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PainGainStep;