// src/components/workshop/steps/SWOTItem.js

import React, { useState } from 'react';
import {
  Typography,
  IconButton,
  TextField,
  Tooltip,
  Box,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { Rnd } from 'react-rnd';
import { getColorByType } from '../../../utils/dataProcessing';
import PropTypes from 'prop-types'; // Added for prop type validation

const grid = 20;

// Subtle pastel sticky note style
const getStickyNoteStyles = (type) => ({
  backgroundColor: '#fffbea',
  border: `2px solid ${getColorByType(type)}`,
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  padding: '8px',
  position: 'relative',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'grab',
  userSelect: 'none',
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: '0 6px 10px rgba(0,0,0,0.2)',
  },
});

const SWOTItem = ({ item, index, quadrant, updateItem, deleteItem }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(item.text);

  const handleSave = () => {
    if (!text.trim()) {
      alert('Cannot save empty text.');
      return;
    }
    updateItem(quadrant, index, { ...item, text: text.trim() });
    setIsEditing(false);
  };

  // Voting up/down
  const handleVote = (delta) => {
    const newVotes = (item.votes || 0) + delta;
    if (newVotes < 0 || newVotes > 50) return; // Cap votes at [0..50]
    updateItem(quadrant, index, { ...item, votes: newVotes });
  };

  const handleDelete = () => {
    if (window.confirm('Delete this sticky?')) {
      deleteItem(quadrant, index);
    }
  };

  return (
    <Rnd
      size={{
        width: item.size?.width || 200,
        height: item.size?.height || 120,
      }}
      position={{
        x: item.position?.x || 0,
        y: item.position?.y || 0,
      }}
      onDragStop={(e, d) => {
        // Snap to grid on drag
        const snappedX = Math.round(d.x / grid) * grid;
        const snappedY = Math.round(d.y / grid) * grid;
        updateItem(quadrant, index, {
          ...item,
          position: { x: snappedX, y: snappedY },
        });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        // Snap to grid on resize
        const snappedWidth = Math.round(parseInt(ref.style.width, 10) / grid) * grid;
        const snappedHeight = Math.round(parseInt(ref.style.height, 10) / grid) * grid;
        const snappedX = Math.round(position.x / grid) * grid;
        const snappedY = Math.round(position.y / grid) * grid;
        updateItem(quadrant, index, {
          ...item,
          size: { width: snappedWidth, height: snappedHeight },
          position: { x: snappedX, y: snappedY },
        });
      }}
      bounds="parent"
      dragGrid={[grid, grid]}
      resizeGrid={[grid, grid]}
      minWidth={140}
      minHeight={80}
      style={{ zIndex: 2 }}
      resizeHandleStyles={{
        bottom: { cursor: 'ns-resize', backgroundColor: '#ddd' },
        bottomLeft: { cursor: 'nwse-resize', backgroundColor: '#ddd' },
        bottomRight: { cursor: 'nwse-resize', backgroundColor: '#ddd' },
        left: { cursor: 'ew-resize', backgroundColor: '#ddd' },
        right: { cursor: 'ew-resize', backgroundColor: '#ddd' },
        top: { cursor: 'ns-resize', backgroundColor: '#ddd' },
        topLeft: { cursor: 'nwse-resize', backgroundColor: '#ddd' },
        topRight: { cursor: 'nwse-resize', backgroundColor: '#ddd' },
      }}
    >
      <Box sx={getStickyNoteStyles(item.type)}>
        {isEditing ? (
          <TextField
            fullWidth
            variant="standard"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleSave}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            autoFocus
            sx={{ mb: 1 }}
            aria-label={`Edit SWOT ${item.type}`}
          />
        ) : (
          <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-word' }}>
            {item.text}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            {/* Upvote */}
            <Tooltip title="Upvote">
              <IconButton size="small" onClick={() => handleVote(1)} aria-label={`Upvote SWOT ${item.type}`}>
                <ThumbUpIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" component="span" sx={{ mx: 0.5 }}>
              {item.votes || 0}
            </Typography>
            {/* Downvote */}
            <Tooltip title="Downvote">
              <IconButton size="small" onClick={() => handleVote(-1)} aria-label={`Downvote SWOT ${item.type}`}>
                <ThumbDownIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box>
            {/* Edit */}
            <Tooltip title={isEditing ? 'Save' : 'Edit'}>
              <IconButton
                size="small"
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  } else {
                    setIsEditing(true);
                  }
                }}
                aria-label={isEditing ? 'Save Edit' : 'Edit SWOT Item'}
              >
                <EditIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            {/* Delete */}
            <Tooltip title="Delete SWOT Item">
              <IconButton size="small" onClick={handleDelete} aria-label="Delete SWOT Item">
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Rnd>
  );
};

// Prop type validation
SWOTItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    votes: PropTypes.number,
    type: PropTypes.oneOf(['strengths', 'weaknesses', 'opportunities', 'threats']).isRequired,
    size: PropTypes.shape({
      width: PropTypes.number,
      height: PropTypes.number,
    }),
    position: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
  }).isRequired,
  index: PropTypes.number.isRequired,
  quadrant: PropTypes.string.isRequired,
  updateItem: PropTypes.func.isRequired,
  deleteItem: PropTypes.func.isRequired,
};

export default SWOTItem;