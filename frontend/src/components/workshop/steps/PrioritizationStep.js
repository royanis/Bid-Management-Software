// src/components/workshop/steps/PrioritizationStep.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Grid,
  Rating,
  LinearProgress
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useBidContext } from '../../../context/BidContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip
} from 'recharts';

/** Compute an average of certain rating fields => priorityScore. */
function computePriorityScore(theme) {
  const fields = [
    theme.businessValue || 0,
    theme.feasibility || 0,
    theme.differentiation || 0
  ];
  const sum = fields.reduce((acc, val) => acc + val, 0);
  const avg = sum / fields.length;
  return parseFloat(avg.toFixed(2)); // e.g., 3.67
}

export default function PrioritizationStep() {
  const { bidId } = useParams();
  const navigate = useNavigate();
  const { bidData, setBidData } = useBidContext();

  // Step # for "Step 5 of 6"
  const currentStep = 5;
  const totalSteps = 6;
  const progressValue = (currentStep / totalSteps) * 100;

  // Grab existing Win Themes from bidData
  const existingWinThemes = bidData?.workshop?.winThemes || [];

  // Local state to avoid re-render loops
  const [themes, setThemes] = useState(existingWinThemes);

  // On mount or if the context changes, re-sync
  useEffect(() => {
    const localJSON = JSON.stringify(themes);
    const contextJSON = JSON.stringify(existingWinThemes);
    if (localJSON !== contextJSON) {
      setThemes(existingWinThemes);
    }
  }, [existingWinThemes]);

  // Push changes to context only if there's a difference
  useEffect(() => {
    const localJSON = JSON.stringify(themes);
    const contextJSON = JSON.stringify(bidData?.workshop?.winThemes || []);
    if (localJSON !== contextJSON) {
      const newBid = { ...bidData };
      newBid.workshop = { ...newBid.workshop, winThemes: themes };
      setBidData(newBid);
    }
  }, [themes, bidData, setBidData]);

  // Handler for rating changes
  const handleRatingChange = (themeId, dimension, newValue) => {
    setThemes((prev) =>
      prev.map((th) => {
        if (th.id === themeId) {
          const updated = { ...th, [dimension]: newValue };
          updated.priorityScore = computePriorityScore(updated);
          return updated;
        }
        return th;
      })
    );
  };

  // Sort by priority descending
  const sortedThemes = useMemo(() => {
    return [...themes].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [themes]);

  // Navigation Handlers
  const handlePrevious = () => {
    navigate(`/win-theme-workshop/${bidId}/win-themes`);
  };

  const handleNext = () => {
    // Save the current themes as finalizedWinThemes
    setBidData((prev) => ({
      ...prev,
      workshop: {
        ...prev.workshop,
        finalizedWinThemes: themes.map(theme => ({ ...theme })), // Deep copy to avoid mutation
      },
    }));
    navigate(`/win-theme-workshop/${bidId}/finalize`);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Title / Explanation box */}
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
        Prioritize Your Win Themes
      </Typography>
      <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
        Rate each Win Theme across multiple dimensions (Business Value, Feasibility, Differentiation). 
        See the spider chart for a visual snapshot. Higher overall priority means it’s more important to emphasize!
      </Typography>

      {/* Step Indicator and Progress Bar */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Step {currentStep} of {totalSteps}
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Typography>
              1. Client Context <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              2. Pains & Gains <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              3. SWOT <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              4. Brainstorm Win Themes <CheckCircleIcon color="success" fontSize="small" />
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
          <LinearProgress variant="determinate" value={progressValue} />
        </Box>
      </Box>

      {/* Display Win Themes */}
      {sortedThemes.length === 0 ? (
        <Typography variant="body1" color="error" align="center" sx={{ mt: 4 }}>
          No Win Themes found. Please go back and add some.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {sortedThemes.map((theme) => {
            // Prepare data for RadarChart
            const radarData = [
              { dimension: 'BusinessValue', rating: theme.businessValue || 0, fullMark: 5 },
              { dimension: 'Feasibility', rating: theme.feasibility || 0, fullMark: 5 },
              { dimension: 'Differentiation', rating: theme.differentiation || 0, fullMark: 5 },
            ];

            return (
              <Paper
                key={theme.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  minWidth: { xs: '100%', sm: 300 },
                  flex: '1 1 300px',
                  backgroundColor: '#fafafa'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {theme.title || 'Untitled Theme'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {theme.rationale || 'No description.'}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {/* Radar Chart */}
                <Box sx={{ mx: 'auto', display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <RadarChart
                    width={250}
                    height={220}
                    data={radarData}
                    outerRadius={80}
                    margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  >
                    <PolarGrid stroke="#ccc" />
                    <PolarAngleAxis dataKey="dimension" stroke="#333" />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#999" />
                    <Radar
                      name={theme.title || ''}
                      dataKey="rating"
                      stroke="#2196f3"
                      fill="#2196f3"
                      fillOpacity={0.3}
                    />
                    <RechartsTooltip />
                  </RadarChart>
                </Box>

                {/* Dimension Ratings */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 110 }}>
                      Business Value
                    </Typography>
                    <Rating
                      name={`businessValue-${theme.id}`}
                      value={theme.businessValue || 0}
                      onChange={(_, newVal) => {
                        const val = newVal || 0;
                        handleRatingChange(theme.id, 'businessValue', val);
                      }}
                      max={5}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 110 }}>
                      Feasibility
                    </Typography>
                    <Rating
                      name={`feasibility-${theme.id}`}
                      value={theme.feasibility || 0}
                      onChange={(_, newVal) => {
                        const val = newVal || 0;
                        handleRatingChange(theme.id, 'feasibility', val);
                      }}
                      max={5}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 110 }}>
                      Differentiation
                    </Typography>
                    <Rating
                      name={`differentiation-${theme.id}`}
                      value={theme.differentiation || 0}
                      onChange={(_, newVal) => {
                        const val = newVal || 0;
                        handleRatingChange(theme.id, 'differentiation', val);
                      }}
                      max={5}
                    />
                  </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Overall Priority: {theme.priorityScore || 0}/5
                </Typography>
              </Paper>
            );
          })}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handlePrevious}>
          Previous
        </Button>
        <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={handleNext}>
          Next
        </Button>
      </Box>
    </Box>
  );
}