import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Checkbox,
  FormControlLabel,
  Button,
  Paper,
} from '@mui/material';
import { useBidContext } from '../context/BidContext';
import { getBidData, saveBidData, deleteBidData, listFiles, moveToArchive } from '../services/apiService';
import Header from './Header';
import Footer from './Footer';

const CreateBidPlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bidData, setBidData, resetBidData } = useBidContext();

  const prepopulatedDeliverables = [
    { label: 'Executive Summary', selected: false },
    { label: 'Solution PPT', selected: false },
    { label: 'Supplier Profile Questions', selected: false },
    { label: 'Rate Card', selected: false },
    { label: 'Commercial Proposal', selected: false },
    { label: 'Resource Profiles', selected: false },
    { label: 'MSA', selected: false },
  ];

  const [clientName, setClientName] = useState('');
  const [opportunityName, setOpportunityName] = useState('');
  const [timeline, setTimeline] = useState({
    rfpIssueDate: '',
    qaSubmissionDate: '',
    proposalSubmissionDate: '',
  });
  const [deliverables, setDeliverables] = useState(prepopulatedDeliverables);
  const [customDeliverables, setCustomDeliverables] = useState('');
  const [errors, setErrors] = useState({});

  const bidId = location.state?.bidId || 'current_bid'; // Use passed bidId or default to current_bid

  useEffect(() => {
    const loadBidData = async () => {
      try {
        console.log('Loading bid data for bidId:', bidId); // Debug log
        const savedBidData = await getBidData(bidId); // Fetch bid data
        if (savedBidData) {
          setClientName(savedBidData.clientName || '');
          setOpportunityName(savedBidData.opportunityName || '');
          setTimeline(savedBidData.timeline || {
            rfpIssueDate: '',
            qaSubmissionDate: '',
            proposalSubmissionDate: '',
          });

          const updatedDeliverables = prepopulatedDeliverables.map((deliverable) => ({
            ...deliverable,
            selected: savedBidData.deliverables?.includes(deliverable.label) || false,
          }));
          setDeliverables(updatedDeliverables);
        }
      } catch (error) {
        console.error('Failed to load bid data:', error);
      }
    };

    loadBidData();
  }, [bidId]);

  const validateFields = () => {
    const newErrors = {};
    if (!clientName.trim()) newErrors.clientName = 'Client Name is required.';
    if (!opportunityName.trim()) newErrors.opportunityName = 'Opportunity Name is required.';
    if (!timeline.rfpIssueDate) newErrors.rfpIssueDate = 'RFP Issue Date is required.';
    if (!timeline.qaSubmissionDate) newErrors.qaSubmissionDate = 'Q&A Submission Date is required.';
    if (!timeline.proposalSubmissionDate) newErrors.proposalSubmissionDate = 'Proposal Submission Date is required.';
    if (!deliverables.some((d) => d.selected)) newErrors.deliverables = 'At least one deliverable must be selected.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckboxChange = (index) => {
    setDeliverables((prev) =>
      prev.map((d, i) => (i === index ? { ...d, selected: !d.selected } : d))
    );
  };

  const addCustomDeliverable = () => {
    if (customDeliverables.trim()) {
      setDeliverables((prev) => [...prev, { label: customDeliverables, selected: true }]);
      setCustomDeliverables('');
    }
  };

  const saveBidWithVersioning = async (bidPayload) => {
    const bidNameBase = `${clientName.replace(/\s+/g, '_')}_${opportunityName.replace(/\s+/g, '_')}`;
    const existingFiles = await listFiles();
    
    // Extract all existing versions
    const currentVersionNumbers = existingFiles
      .filter((file) => file.id.startsWith(bidNameBase))
      .map((file) => parseInt(file.id.match(/Version (\d+)/)?.[1], 10) || 0);
  
    const newVersion = Math.max(0, ...currentVersionNumbers) + 1; // Increment version
    const newBidId = `${bidNameBase}_Version ${newVersion}`;
  
    if (currentVersionNumbers.length > 0) {
      // Fetch the latest existing version
      const lastVersion = Math.max(...currentVersionNumbers);
      const previousBidId = `${bidNameBase}_Version ${lastVersion}`;
      const previousBidData = await getBidData(previousBidId);
  
      // Merge data from the previous version excluding timeline and deliverables
      bidPayload = {
        ...previousBidData,
        ...bidPayload,
        timeline: bidPayload.timeline, // Keep new timeline
        deliverables: bidPayload.deliverables, // Keep new deliverables
        bidId: newBidId, // Assign the new versioned bidId
      };
  
      // Archive the previous version
      await moveToArchive(previousBidId);
    }
  
    // Save the new version
    await saveBidData(bidPayload);
    setBidData(bidPayload);
  
    alert(`Bid saved successfully as ${newBidId}`);
  };

  const handleNavigation = async (path) => {
    if (!validateFields()) return;

    const bidPayload = {
      clientName,
      opportunityName,
      timeline,
      deliverables: deliverables.filter((d) => d.selected).map((d) => d.label),
    };

    await saveBidWithVersioning(bidPayload);
    navigate(path);
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel? This will delete all progress.')) {
      resetBidData();
      try {
        await deleteBidData(bidId);
        alert('Bid creation canceled.');
      } catch (error) {
        console.error('Error canceling bid:', error);
        alert('Failed to cancel bid: ' + error.message);
      }
      navigate('/');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title="Create New Bid Plan" />

      <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
        <Paper elevation={10} sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
          <Typography variant="h5" color="primary" gutterBottom>
            Create New Bid Plan
          </Typography>

          {Object.keys(errors).length > 0 && (
            <Box mb={3}>
              {Object.entries(errors).map(([key, error]) => (
                <Typography key={key} variant="body2" color="error">
                  {error}
                </Typography>
              ))}
            </Box>
          )}

          <Box mb={3}>
            <TextField
              fullWidth
              label="Client Name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              error={!!errors.clientName}
              helperText={errors.clientName}
            />
          </Box>

          <Box mb={3}>
            <TextField
              fullWidth
              label="Opportunity Name"
              value={opportunityName}
              onChange={(e) => setOpportunityName(e.target.value)}
              error={!!errors.opportunityName}
              helperText={errors.opportunityName}
            />
          </Box>

          <Grid container spacing={2} mb={3}>
            {[
              { label: 'RFP Issue Date', value: timeline.rfpIssueDate, key: 'rfpIssueDate' },
              { label: 'Q&A Submission Date', value: timeline.qaSubmissionDate, key: 'qaSubmissionDate' },
              { label: 'Proposal Submission Date', value: timeline.proposalSubmissionDate, key: 'proposalSubmissionDate' },
            ].map(({ label, value, key }) => (
              <Grid item xs={12} sm={4} key={key}>
                <TextField
                  fullWidth
                  label={label}
                  type="date"
                  value={value}
                  onChange={(e) => setTimeline({ ...timeline, [key]: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  error={!!errors[key]}
                  helperText={errors[key]}
                />
              </Grid>
            ))}
          </Grid>

          <Box mb={3}>
            <Typography variant="h6">Deliverables</Typography>
            <Grid container spacing={2}>
              {deliverables.map((d, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={d.selected}
                        onChange={() => handleCheckboxChange(index)}
                        sx={{ '&.Mui-checked': { color: 'primary.main' } }}
                      />
                    }
                    label={d.label}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box mb={3}>
            <TextField
              fullWidth
              label="Add Custom Deliverable"
              value={customDeliverables}
              onChange={(e) => setCustomDeliverables(e.target.value)}
            />
            <Button variant="contained" color="primary" onClick={addCustomDeliverable} sx={{ mt: 1 }}>
              Add Deliverable
            </Button>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Button variant="outlined" color="secondary" onClick={() => navigate('/')} sx={{ mr: 2 }}>
              Home
            </Button>
            <Button variant="contained" color="primary" onClick={() => handleNavigation('/flying-formation')} sx={{ mr: 2 }}>
              Next
            </Button>
            <Button variant="outlined" color="error" onClick={handleCancel}>
              Cancel
            </Button>
          </Box>
        </Paper>
      </Box>

      <Footer />
    </Box>
  );
};

export default CreateBidPlan;