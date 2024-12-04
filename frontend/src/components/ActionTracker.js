import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

const ActionTracker = ({ actions, onActionClick }) => {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Action Tracker
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Activity</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
            <TableCell>Remarks</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {actions.map((action, index) => (
            <TableRow
              key={index}
              onClick={() => onActionClick(action)}
              style={{ cursor: 'pointer' }}
            >
              <TableCell>{action.activity}</TableCell>
              <TableCell>{action.status}</TableCell>
              <TableCell>{action.actions}</TableCell>
              <TableCell>{action.remarks}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default ActionTracker;