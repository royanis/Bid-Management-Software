// src/components/workshop/steps/SWOTFinalizeDialog.jsx

import React, { useState } from 'react';
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
  width: 600,
  maxHeight: '80vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  overflowY: 'auto',
};

const SWOTFinalizeDialog = ({ open, handleClose, swotData, finalizeSwot }) => {
  const [selectedStrengths, setSelectedStrengths] = useState([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState([]);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [selectedThreats, setSelectedThreats] = useState([]);

  const handleCheckboxChange = (category, id) => {
    switch (category) {
      case 'strengths':
        setSelectedStrengths((prev) =>
          prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
        break;
      case 'weaknesses':
        setSelectedWeaknesses((prev) =>
          prev.includes(id) ? prev.filter((wid) => wid !== id) : [...prev, id]
        );
        break;
      case 'opportunities':
        setSelectedOpportunities((prev) =>
          prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
        );
        break;
      case 'threats':
        setSelectedThreats((prev) =>
          prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]
        );
        break;
      default:
        break;
    }
  };

  const handleSubmit = () => {
    const selectedItems = {
      strengths: selectedStrengths,
      weaknesses: selectedWeaknesses,
      opportunities: selectedOpportunities,
      threats: selectedThreats,
    };

    // linkedStrategies can be handled similarly or enhanced based on your strategy planning
    const linkedStrategies = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    };

    finalizeSwot(selectedItems, linkedStrategies);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="swot-finalize-dialog-title"
      aria-describedby="swot-finalize-dialog-description"
    >
      <Box sx={ModalStyle}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography id="swot-finalize-dialog-title" variant="h6" component="h2">
            Finalize SWOT Analysis
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle1" gutterBottom>
          Select the SWOT items you want to finalize:
        </Typography>

        {/* Strengths */}
        <Typography variant="subtitle2" gutterBottom>
          Strengths:
        </Typography>
        <FormGroup>
          {swotData.strengths.map((strength) => (
            <FormControlLabel
              key={strength.id}
              control={
                <Checkbox
                  checked={selectedStrengths.includes(strength.id)}
                  onChange={() => handleCheckboxChange('strengths', strength.id)}
                />
              }
              label={strength.text}
            />
          ))}
        </FormGroup>

        {/* Weaknesses */}
        <Typography variant="subtitle2" gutterBottom mt={2}>
          Weaknesses:
        </Typography>
        <FormGroup>
          {swotData.weaknesses.map((weakness) => (
            <FormControlLabel
              key={weakness.id}
              control={
                <Checkbox
                  checked={selectedWeaknesses.includes(weakness.id)}
                  onChange={() => handleCheckboxChange('weaknesses', weakness.id)}
                />
              }
              label={weakness.text}
            />
          ))}
        </FormGroup>

        {/* Opportunities */}
        <Typography variant="subtitle2" gutterBottom mt={2}>
          Opportunities:
        </Typography>
        <FormGroup>
          {swotData.opportunities.map((opportunity) => (
            <FormControlLabel
              key={opportunity.id}
              control={
                <Checkbox
                  checked={selectedOpportunities.includes(opportunity.id)}
                  onChange={() => handleCheckboxChange('opportunities', opportunity.id)}
                />
              }
              label={opportunity.text}
            />
          ))}
        </FormGroup>

        {/* Threats */}
        <Typography variant="subtitle2" gutterBottom mt={2}>
          Threats:
        </Typography>
        <FormGroup>
          {swotData.threats.map((threat) => (
            <FormControlLabel
              key={threat.id}
              control={
                <Checkbox
                  checked={selectedThreats.includes(threat.id)}
                  onChange={() => handleCheckboxChange('threats', threat.id)}
                />
              }
              label={threat.text}
            />
          ))}
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
            disabled={
              selectedStrengths.length === 0 &&
              selectedWeaknesses.length === 0 &&
              selectedOpportunities.length === 0 &&
              selectedThreats.length === 0
            }
          >
            Finalize
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default SWOTFinalizeDialog;