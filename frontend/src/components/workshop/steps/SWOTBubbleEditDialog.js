// src/components/workshop/steps/SWOTBubbleEditDialog.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Tooltip,
  MenuItem,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Enhanced SWOTBubbleEditDialog that allows:
 *  - Changing the type ("cluster")
 *  - Changing text, comment, impactScore
 *  - Upvoting / downvoting
 */
const SWOTBubbleEditDialog = ({ open, item, onClose }) => {
  const [tempText, setTempText] = useState(item.text || '');
  const [tempVotes, setTempVotes] = useState(item.votes || 0);
  const [tempType, setTempType] = useState(item.cluster || 'strengths');
  const [tempComment, setTempComment] = useState(item.comment || '');
  const [tempImpactScore, setTempImpactScore] = useState(
    item.impactScore !== undefined ? item.impactScore : 0
  );

  const handleUpVote = () => setTempVotes((v) => Math.min(50, v + 1));
  const handleDownVote = () => setTempVotes((v) => Math.max(0, v - 1));

  const handleDelete = () => {
    onClose('delete', item); // we just signal "delete" to parent
  };

  const handleSave = () => {
    // Merge updates back into the item
    const updated = {
      ...item,
      text: tempText.trim(),
      votes: tempVotes,
      cluster: tempType,   // user-chosen quadrant
      comment: tempComment,
      impactScore: Number(tempImpactScore),
    };
    onClose('save', updated);
  };

  return (
    <Dialog open={open} onClose={() => onClose('cancel')} maxWidth="sm" fullWidth>
      <DialogTitle>Edit SWOT Item</DialogTitle>
      <DialogContent dividers>
        {/* TEXT FIELD */}
        <TextField
          label="SWOT Text"
          fullWidth
          variant="outlined"
          value={tempText}
          onChange={(e) => setTempText(e.target.value)}
          sx={{ mb: 2 }}
        />
        {/* TYPE SELECT */}
        <TextField
          select
          label="SWOT Type"
          variant="outlined"
          fullWidth
          value={tempType}
          onChange={(e) => setTempType(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="strengths">Strengths</MenuItem>
          <MenuItem value="weaknesses">Weaknesses</MenuItem>
          <MenuItem value="opportunities">Opportunities</MenuItem>
          <MenuItem value="threats">Threats</MenuItem>
        </TextField>
        {/* COMMENT TEXT FIELD */}
        <TextField
          label="Comment / Notes"
          multiline
          minRows={2}
          fullWidth
          variant="outlined"
          value={tempComment}
          onChange={(e) => setTempComment(e.target.value)}
          sx={{ mb: 2 }}
        />
        {/* IMPACT SCORE FIELD */}
        <TextField
          label="Impact Score"
          type="number"
          fullWidth
          variant="outlined"
          value={tempImpactScore}
          onChange={(e) => setTempImpactScore(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* VOTING CONTROLS */}
        <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
          <Tooltip title="Upvote">
            <IconButton onClick={handleUpVote}>
              <ThumbUpIcon />
            </IconButton>
          </Tooltip>
          <Typography>{tempVotes}</Typography>
          <Tooltip title="Downvote">
            <IconButton onClick={handleDownVote}>
              <ThumbDownIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button variant="text" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>
          Delete
        </Button>
        <Button onClick={() => onClose('cancel')} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SWOTBubbleEditDialog;