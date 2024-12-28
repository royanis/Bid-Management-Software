// src/components/workshop/steps/SWOTQuadrant.jsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import SWOTItem from './SWOTItem';
import { getColorByType } from '../../../utils/dataProcessing';

const grid = 20;

/**
 * Utility to find the next open "grid" position for new sticky.
 */
function calculateNextPosition(items, grid, containerWidth, stickyWidth, stickyHeight) {
  const positions = items.map(item => ({
    x: item.position?.x || 0,
    y: item.position?.y || 0,
    width: item.size?.width || stickyWidth,
    height: item.size?.height || stickyHeight,
  }));

  positions.sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const columns = Math.floor(containerWidth / (stickyWidth + grid));
  const occupied = {};

  for (const pos of positions) {
    const col = Math.floor(pos.x / (stickyWidth + grid));
    const row = Math.floor(pos.y / (stickyHeight + grid));
    occupied[`${row}-${col}`] = true;
  }

  for (let row = 0; row < 100; row++) {
    for (let col = 0; col < columns; col++) {
      if (!occupied[`${row}-${col}`]) {
        return { x: col * (stickyWidth + grid), y: row * (stickyHeight + grid) };
      }
    }
  }

  return { x: 0, y: 0 };
}

const SWOTQuadrant = ({ title, items, droppableId, updateItem, deleteItem }) => {
  const [newItemText, setNewItemText] = useState('');
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const defaultWidth = 200;
    const defaultHeight = 120;
    const position = calculateNextPosition(items, grid, containerWidth, defaultWidth, defaultHeight);

    const newItem = {
      id: uuidv4(),
      text: newItemText.trim(),
      votes: 0,
      comment: '',
      impactScore: 0,
      position: { x: position.x, y: position.y },
      size: { width: defaultWidth, height: defaultHeight },
      type: title.slice(0, -1), // e.g. "Strength"
    };

    // index = null => we pass an entire array
    updateItem(droppableId, null, [...items, newItem]);
    setNewItemText('');
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(to bottom right, #fffdfd, #fafcff)', // Pastel
        height: '480px',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="swot-quadrant"
    >
      <Typography
        variant="h6"
        sx={{ mb: 1, fontWeight: 'medium', textAlign: 'center', color: '#333' }}
      >
        {title}
      </Typography>

      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          flex: 1,
          overflow: 'auto',
          borderRadius: 2,
          p: 1,
        }}
      >
        {items.map((item, index) => (
          <SWOTItem
            key={item.id}
            item={item}
            index={index}
            quadrant={droppableId}
            updateItem={updateItem}
            deleteItem={deleteItem}
          />
        ))}
      </Box>

      {/* Add new item row */}
      <Box display="flex" alignItems="center" mt={2}>
        <TextField
          label={`New ${title.slice(0, -1)}`}
          variant="outlined"
          size="small"
          fullWidth
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddItem();
            }
          }}
          className="add-item-button"
        />
        <Tooltip title={`Add ${title.slice(0, -1)}`}>
          <IconButton
            color="primary"
            onClick={handleAddItem}
            disabled={!newItemText.trim()}
            sx={{ ml: 1 }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default SWOTQuadrant;