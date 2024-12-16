// src/context/BidContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material'; // For user feedback
import {
  getBidData,
  saveBidData,
  deleteBidData,
  updateActivity,
  getActionTrackerData,
  addAction,
  updateSingleAction,
  deleteAction,
  createActionTracker,
} from '../services/apiService'; // Importing necessary API functions

// Create the Bid Context
const BidContext = createContext();

// Custom hook to use the Bid Context
export const useBidContext = () => useContext(BidContext);

// BidProvider Component
export const BidProvider = ({ children }) => {
  // State Variables
  const [bidData, setBidData] = useState(null); // Store bid details
  const [selectedBidId, setSelectedBidId] = useState('DefaultClient_DefaultOpportunity_Version1'); // Default ID
  const [currentStep, setCurrentStep] = useState(1); // Track the current step
  const [loading, setLoading] = useState(false); // Loading state for async operations
  const [error, setError] = useState(null); // Track errors for UI feedback

  // Action Tracker States
  const [actionTrackerData, setActionTrackerData] = useState(null); // Store Action Tracker details
  const [actionLoading, setActionLoading] = useState(false); // Loading state for Action Tracker operations
  const [actionError, setActionError] = useState(null); // Track errors related to Action Tracker

  // Snackbar for user feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success', 'error', 'warning', 'info'
  });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Load initial bid data when selectedBidId changes
  useEffect(() => {
    const loadInitialBidData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBidData(selectedBidId); // Fetch data from backend
        if (data) {
          setBidData(data);
          setCurrentStep(2); // Example: Set step 2 if data exists
        } else {
          console.warn('No data found for selected bid:', selectedBidId);
          setCurrentStep(1); // If no data, reset to initial step
        }
      } catch (err) {
        console.error('Error loading bid data:', err);
        setError('Failed to load bid data. Please try again.');
        showSnackbar('Failed to load bid data. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadInitialBidData();
  }, [selectedBidId, showSnackbar]);

  // Save bid data whenever it changes
  useEffect(() => {
    const saveData = async () => {
      if (bidData && Object.keys(bidData).length > 0) {
        setError(null);
        try {
          await saveBidData(bidData); // Save updated data to backend
          console.log('Bid data saved successfully:', bidData);
          showSnackbar('Bid data saved successfully.', 'success');
        } catch (err) {
          console.error('Error saving bid data:', err);
          setError('Failed to save bid data. Please try again.');
          showSnackbar('Failed to save bid data. Please try again.', 'error');
        }
      }
    };

    saveData();
  }, [bidData, showSnackbar]);

  // Load Action Tracker data when bidData is loaded
  useEffect(() => {
    const loadActionTracker = async () => {
      if (bidData) {
        setActionLoading(true);
        setActionError(null);
        try {
          const data = await getActionTrackerData(selectedBidId);
          if (data) {
            setActionTrackerData(data);
          } else {
            // If no Action Tracker exists, initialize one
            const newTracker = await createActionTracker(selectedBidId);
            setActionTrackerData(newTracker);
            showSnackbar('Initialized new Action Tracker.', 'info');
            console.log('Initialized new Action Tracker.');
          }
        } catch (err) {
          console.error('Error loading Action Tracker data:', err);
          setActionError('Failed to load Action Tracker data.');
          showSnackbar('Failed to load Action Tracker data.', 'error');
        } finally {
          setActionLoading(false);
        }
      }
    };

    loadActionTracker();
  }, [bidData, selectedBidId, showSnackbar]);

  const loadBidData = useCallback(async (bidId) => {
    setLoading(true);
    setError(null);
    try {
      if (!bidId.match(/^[\w]+_[\w]+_Version\d+$/)) {
        throw new Error('Invalid bid ID format. Expected format: ClientName_OpportunityName_VersionXX');
      }

      const data = await getBidData(bidId);
      if (data) {
        setBidData(data);
        setSelectedBidId(bidId); // Update the selected bid ID
        setCurrentStep(2); // Set appropriate step if data exists
      } else {
        console.warn('No data found for bidId:', bidId);
        setBidData(null);
        setSelectedBidId(bidId);
        setCurrentStep(1);
      }
    } catch (err) {
      console.error('Error loading bid data:', err);
      setError(err.message || 'Failed to load bid data. Please try again.');
      showSnackbar(err.message || 'Failed to load bid data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  const resetBidData = useCallback(async () => {
    const currentYear = new Date().getFullYear();
    const defaultId = `DefaultClient_DefaultOpportunity_Version${currentYear}`;
    setLoading(true);
    setError(null);
    try {
      await deleteBidData(selectedBidId); // Delete data from backend
      setBidData(null);
      setSelectedBidId(defaultId); // Set a new default ID
      setCurrentStep(1); // Reset the current step to the first step
      setActionTrackerData(null); // Reset Action Tracker data
      showSnackbar('Bid data reset successfully.', 'success');
      console.log('Bid data reset successfully.');
    } catch (err) {
      console.error('Error resetting bid data:', err);
      setError('Failed to reset bid data. Please try again.');
      showSnackbar('Failed to reset bid data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedBidId, showSnackbar]);

  const updateBidData = useCallback((updates) => {
    setBidData((prevData) => ({
      ...prevData,
      ...updates,
      team: {
        core: updates.team?.core || prevData?.team?.core || [],
        solution: updates.team?.solution || prevData?.team?.solution || [],
      },
      activities: updates.activities || prevData.activities || {},
    }));
    console.log('Bid data updated:', updates);
    showSnackbar('Bid data updated successfully.', 'success');
  }, [showSnackbar]);

  const updateActivityInContext = useCallback(async (deliverable, updatedActivity) => {
    try {
      await updateActivity(selectedBidId, deliverable, updatedActivity);

      setBidData((prevData) => {
        const updatedActivities = { ...prevData.activities };

        if (updatedActivities[deliverable]) {
          updatedActivities[deliverable] = updatedActivities[deliverable].map((activity) =>
            activity.name === updatedActivity.name ? { ...activity, ...updatedActivity } : activity
          );
        }

        return {
          ...prevData,
          activities: updatedActivities,
        };
      });

      console.log('Activity updated successfully in context:', updatedActivity);
      showSnackbar('Activity updated successfully.', 'success');
    } catch (err) {
      console.error('Error updating activity in context:', err);
      setActionError('Failed to update activity.');
      showSnackbar('Failed to update activity. Please try again.', 'error');
    }
  }, [selectedBidId, showSnackbar]);

  const addNewActionHandler = useCallback(async (actionData) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await addAction(selectedBidId, actionData);
      if (response.success) {
        const updatedTracker = await getActionTrackerData(selectedBidId);
        setActionTrackerData(updatedTracker);
        showSnackbar('Action added successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to add action.');
      }
    } catch (err) {
      console.error('Error adding action:', err);
      setActionError('Failed to add action.');
      showSnackbar('Failed to add action. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedBidId, showSnackbar]);

  const updateExistingActionHandler = useCallback(async (actionId, updatedData) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await updateSingleAction(selectedBidId, actionId, updatedData);
      if (response.success) {
        const updatedTracker = await getActionTrackerData(selectedBidId);
        setActionTrackerData(updatedTracker);
        showSnackbar('Action updated successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to update action.');
      }
    } catch (err) {
      console.error('Error updating action:', err);
      setActionError('Failed to update action.');
      showSnackbar('Failed to update action. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedBidId, showSnackbar]);

  const deleteExistingActionHandler = useCallback(async (actionId) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await deleteAction(selectedBidId, actionId);
      if (response.success) {
        const updatedTracker = await getActionTrackerData(selectedBidId);
        setActionTrackerData(updatedTracker);
        showSnackbar('Action deleted successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to delete action.');
      }
    } catch (err) {
      console.error('Error deleting action:', err);
      setActionError('Failed to delete action.');
      showSnackbar('Failed to delete action. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [selectedBidId, showSnackbar]);

  return (
    <BidContext.Provider
      value={{
        bidData,
        setBidData,
        selectedBidId,
        setSelectedBidId,
        currentStep,
        setCurrentStep,
        loadBidData,
        resetBidData,
        updateBidData,
        updateActivityInContext,
        loading,
        error,
        actionTrackerData,
        setActionTrackerData,
        actionLoading,
        actionError,
        addNewAction: addNewActionHandler,
        updateExistingAction: updateExistingActionHandler,
        deleteExistingAction: deleteExistingActionHandler,
        showSnackbar,
        handleCloseSnackbar,
      }}
    >
      {children}
      {/* Snackbar Component for User Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </BidContext.Provider>
  );
};

export default BidProvider;