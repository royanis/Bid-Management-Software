import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';

const KeyActivities = ({ activities }) => {
  const sortedActivities = [...activities].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Key Activities for Today
      </Typography>
      <List>
        {sortedActivities.map((activity, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={activity.activity}
              secondary={`Assigned to: ${activity.assignedTo}, Status: ${activity.status}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default KeyActivities;