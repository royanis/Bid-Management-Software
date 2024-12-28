// src/components/workshop/steps/SWOTLinkDialog.jsx

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Button,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const ModalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  maxHeight: '80vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  overflowY: 'auto',
  zIndex: 1300, // Ensure it's above other elements
};

const SWOTLinkDialog = ({ open, handleClose, swotItem, finalizedPains, finalizedGains, handleLink }) => {
  const [selectedPains, setSelectedPains] = useState([]);
  const [selectedGains, setSelectedGains] = useState([]);

  useEffect(() => {
    console.log('SWOTLinkDialog Props:', { open, swotItem, finalizedPains, finalizedGains });
    // Reset selections when the dialog is opened or closed
    if (!open) {
      setSelectedPains([]);
      setSelectedGains([]);
    }
  }, [open, swotItem, finalizedPains, finalizedGains]);

  const handlePainChange = (id) => {
    setSelectedPains((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleGainChange = (id) => {
    setSelectedGains((prev) =>
      prev.includes(id) ? prev.filter((gid) => gid !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (handleLink && swotItem) {
      handleLink(swotItem.id, selectedPains, selectedGains);
    }
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="swot-link-dialog-title"
      aria-describedby="swot-link-dialog-description"
    >
      <Box sx={ModalStyle}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography id="swot-link-dialog-title" variant="h6" component="h2">
            Link to Finalized Pains and Gains
          </Typography>
          <IconButton onClick={handleClose} aria-label="Close Link Dialog">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle1" gutterBottom>
          Linking SWOT Item: <strong>{swotItem?.text || 'N/A'}</strong>
        </Typography>

        {/* Link to Pains */}
        <Typography variant="subtitle2" gutterBottom>
          Select Pains to Link:
        </Typography>
        <FormGroup>
          {Array.isArray(finalizedPains) && finalizedPains.length > 0 ? (
            finalizedPains.map((pain) => (
              <FormControlLabel
                key={pain.id}
                control={
                  <Checkbox
                    checked={selectedPains.includes(pain.id)}
                    onChange={() => handlePainChange(pain.id)}
                  />
                }
                label={pain.text}
              />
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No finalized pains available.
            </Typography>
          )}
        </FormGroup>

        {/* Link to Gains */}
        <Typography variant="subtitle2" gutterBottom mt={2}>
          Select Gains to Link:
        </Typography>
        <FormGroup>
          {Array.isArray(finalizedGains) && finalizedGains.length > 0 ? (
            finalizedGains.map((gain) => (
              <FormControlLabel
                key={gain.id}
                control={
                  <Checkbox
                    checked={selectedGains.includes(gain.id)}
                    onChange={() => handleGainChange(gain.id)}
                  />
                }
                label={gain.text}
              />
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No finalized gains available.
            </Typography>
          )}
        </FormGroup>

        {/* Action Buttons */}
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button onClick={handleClose} color="secondary" sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={selectedPains.length === 0 && selectedGains.length === 0}
          >
            Link
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SWOTLinkDialog;