import React from 'react';
import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#3f51b5', '#ff9800', '#4caf50', '#e91e63'];

const KeyMetrics = ({ metrics = {} }) => {
  const { completionByTrack = [], completionByPerson = [], upcomingMilestones = [] } = metrics;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Key Metrics
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {/* Completion by Track */}
        <Box sx={{ flex: 1, minWidth: 300, height: 300 }}>
          <Typography variant="subtitle1">Completion by Track</Typography>
          {completionByTrack.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionByTrack}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3f51b5" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography>No data available</Typography>
          )}
        </Box>

        {/* Completion by Person */}
        <Box sx={{ flex: 1, minWidth: 300, height: 300 }}>
          <Typography variant="subtitle1">Completion by Person</Typography>
          {completionByPerson.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={completionByPerson} dataKey="value" outerRadius={100} label>
                  {completionByPerson.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Typography>No data available</Typography>
          )}
        </Box>

        {/* Upcoming Milestones */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Typography variant="subtitle1">Upcoming Milestones</Typography>
          {upcomingMilestones.length > 0 ? (
            <ul>
              {upcomingMilestones.map((milestone, index) => (
                <li key={index}>
                  {milestone.name} - {new Date(milestone.date).toLocaleDateString()}
                </li>
              ))}
            </ul>
          ) : (
            <Typography>No upcoming milestones</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default KeyMetrics;