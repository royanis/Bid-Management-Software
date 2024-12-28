// src/components/workshop/steps/Legend.js

import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';

const legendItems = [
  { color: '#FF4136', label: 'Central Node' },
  { color: '#2ECC40', label: 'Win Theme' },
  { color: '#FF851B', label: 'Pain' },
  { color: '#B10DC9', label: 'Gain' },
  { color: '#0074D9', label: 'Evaluation Criteria' },
  { color: '#39CCCC', label: 'Strengths' },
  { color: '#FF4136', label: 'Weaknesses' },
  { color: '#3D9970', label: 'Opportunities' },
  { color: '#85144b', label: 'Threats' },
];

const Legend = () => (
  <Paper sx={{ p: 2, mt: 2 }}>
    <Typography variant="h6" gutterBottom>
      Legend
    </Typography>
    <Grid container spacing={1}>
      {legendItems.map((item, index) => (
        <Grid item xs={6} sm={4} md={3} key={index} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 20, height: 20, bgcolor: item.color, mr: 1 }} />
          <Typography variant="body2">{item.label}</Typography>
        </Grid>
      ))}
    </Grid>
  </Paper>
);

export default Legend;