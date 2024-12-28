// src/context/BidContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';
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
} from '../services/apiService';

const BidContext = createContext();

/**
 * Hook to consume the BidContext
 */
export const useBidContext = () => useContext(BidContext);

/**
 * Provider Component
 */
export const BidProvider = ({ children }) => {
  // Which bid are we looking at?
  const [selectedBidId, setSelectedBidId] = useState(null);

  // The main data object for the selected bid
  const [bidData, setBidData] = useState(null);

  // Additional states: step tracking, loading, etc.
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Action Tracker data
  const [actionTrackerData, setActionTrackerData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Helper to show snackbar
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Helper to close snackbar
  const handleCloseSnackbar = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  /**
   * 1) On mount or whenever 'selectedBidId' changes, fetch the data from the backend
   */
  useEffect(() => {
    if (!selectedBidId) return; // Exit if no bid is selected

    const loadInitialBidData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBidData(selectedBidId);
        if (data) {
          // Ensure we have the swot structure
          if (!data.workshop) data.workshop = {};
          if (!data.workshop.swot) {
            data.workshop.swot = {
              strengths: [],
              weaknesses: [],
              opportunities: [],
              threats: [],
            };
          }
          setBidData(data);
          setCurrentStep(2);
          console.log('[BidContext] Loaded bid data:', data);
        } else {
          // If no data found
          console.warn('[BidContext] No data found for:', selectedBidId);
          showSnackbar(`No data found for ${selectedBidId}. Please create a new bid.`, 'info');
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

  /**
   * 2) Whenever bidData changes, automatically call saveBidData to persist it
   */
  useEffect(() => {
    if (!bidData || !bidData.bidId) return; // Ensure bidId exists

    const saveData = async () => {
      try {
        console.log('[BidContext] Saving bidData =>', bidData);
        await saveBidData(bidData);
        console.log('[BidContext] Saved data successfully:', bidData);
        showSnackbar('Bid data saved successfully.', 'success');
      } catch (err) {
        console.error('Error saving bid data:', err);
        setError('Failed to save bid data. Please try again.');
        showSnackbar('Failed to save bid data. Please try again.', 'error');
      }
    };

    saveData();
  }, [bidData, showSnackbar]);

  /**
   * 3) Once bidData is loaded, also load (or create) the Action Tracker for it
   */
  useEffect(() => {
    const loadActionTracker = async () => {
      if (!bidData) return;
      setActionLoading(true);
      setActionError(null);
      try {
        const tracker = await getActionTrackerData(selectedBidId);
        if (tracker) {
          setActionTrackerData(tracker);
        } else {
          // If not found, create a new one
          const newTracker = await createActionTracker(selectedBidId);
          setActionTrackerData(newTracker);
          showSnackbar('Initialized new Action Tracker.', 'info');
          console.log('[BidContext] Created new Action Tracker for', selectedBidId);
        }
      } catch (err) {
        console.error('Error loading Action Tracker:', err);
        setActionError('Failed to load Action Tracker.');
        showSnackbar('Failed to load Action Tracker data.', 'error');
      } finally {
        setActionLoading(false);
      }
    };
    loadActionTracker();
  }, [bidData, selectedBidId, showSnackbar]);

  /**
   * 4) A helper to load a different bid by ID
   */
  const loadBidDataById = useCallback((bidId) => {
    setSelectedBidId(bidId);
  }, []);

  /**
   * 5) If user wants to reset (delete) the current bid data from the backend
   */
  const resetBidData = useCallback(async () => {
    if (!selectedBidId) {
      showSnackbar('No bid selected to reset.', 'warning');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await deleteBidData(selectedBidId);
      setBidData(null); // Reset bid data
      setActionTrackerData(null);
      setCurrentStep(1);
      showSnackbar('Bid data reset successfully.', 'success');
    } catch (err) {
      console.error('Error resetting bid data:', err);
      setError('Failed to reset bid data. Please try again.');
      showSnackbar('Failed to reset bid data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedBidId, showSnackbar]);

  /**
   * 6) The main function we call to update the bidData in partial form
   *    We'll shallow-merge your partial data into the existing `bidData`.
   *    e.g. updateBidData({ workshop: { swot: {...} } })
   */
  const updateBidData = useCallback((partialData) => {
    setBidData((prevData) => {
      if (!prevData) return prevData;
      // Shallow merge
      const merged = {
        ...prevData,
        ...partialData, // merges top-level fields like bidId
        workshop: {
          // merge the sub-object workshop
          ...prevData.workshop,
          ...(partialData.workshop || {}),
        },
      };
      return merged;
    });
  }, []);

  /**
   * Additional helpers for updating an activity, or Action Tracker actions
   * (Add, update, delete actions, etc.)
   */

  const updateActivityInContext = useCallback(async (deliverable, updatedActivity) => {
    try {
      await updateActivity(selectedBidId, deliverable, updatedActivity);
      setBidData((prevData) => {
        if (!prevData || !prevData.activities) return prevData;
        const updatedActivities = { ...prevData.activities };
        if (updatedActivities[deliverable]) {
          updatedActivities[deliverable] = updatedActivities[deliverable].map((act) =>
            act.name === updatedActivity.name ? { ...act, ...updatedActivity } : act
          );
        }
        return { ...prevData, activities: updatedActivities };
      });
      console.log('[BidContext] Updated activity in context:', updatedActivity);
      showSnackbar('Activity updated successfully.', 'success');
    } catch (err) {
      console.error('Error updating activity in context:', err);
      setActionError('Failed to update activity.');
      showSnackbar('Failed to update activity. Please try again.', 'error');
    }
  }, [selectedBidId, showSnackbar]);

  // Example: add new action to Action Tracker
  const addNewAction = useCallback(async (actionData) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await addAction(selectedBidId, actionData);
      if (response.success) {
        // Refresh
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

  // Example: update existing action
  const updateExistingAction = useCallback(async (actionId, updatedData) => {
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

  // Example: delete an action
  const deleteExistingAction = useCallback(async (actionId) => {
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

  /**
   * Return our context
   */
  return (
    <BidContext.Provider
      value={{
        // Data
        bidData,
        setBidData,
        selectedBidId,
        setSelectedBidId,
        currentStep,
        setCurrentStep,
        // Loading/errors
        loading,
        error,
        actionTrackerData,
        actionLoading,
        actionError,

        // Key methods
        loadBidData: loadBidDataById,
        resetBidData,
        updateBidData,          // <-- The new 'partial object' method
        updateActivityInContext,

        // Action tracker functions
        addNewAction,
        updateExistingAction,
        deleteExistingAction,

        // Snackbar
        showSnackbar,
        handleCloseSnackbar,
      }}
    >
      {children}
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