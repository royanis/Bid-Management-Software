import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBidData, saveBidData, deleteBidData, updateActivity } from '../services/apiService'; // Ensure updateActivity is implemented in apiService.js

// Create the Bid Context
const BidContext = createContext();

export const BidProvider = ({ children }) => {
  const [bidData, setBidData] = useState(null); // Store bid details
  const [currentStep, setCurrentStep] = useState(1); // Track the current step
  const [loading, setLoading] = useState(false); // Loading state for async operations
  const [error, setError] = useState(null); // Track errors for UI feedback
  const [selectedBidId, setSelectedBidId] = useState('DefaultClient_DefaultOpportunity_Version1'); // Default ID

  // Load bid data on selectedBidId change
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
        }
      } catch (err) {
        console.error('Error loading bid data:', err);
        setError('Failed to load bid data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialBidData();
  }, [selectedBidId]);

  // Save bid data whenever it changes
  useEffect(() => {
    const saveData = async () => {
      if (bidData && Object.keys(bidData).length > 0) {
        setError(null);
        try {
          await saveBidData(bidData); // Save updated data to backend
          console.log('Bid data saved successfully:', bidData);
        } catch (err) {
          console.error('Error saving bid data:', err);
          setError('Failed to save bid data. Please try again.');
        }
      }
    };

    saveData();
  }, [bidData]);

  // Function to load bid data for a specific bidId
  const loadBidData = async (bidId) => {
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
      }
    } catch (err) {
      console.error('Error loading bid data:', err);
      setError(err.message || 'Failed to load bid data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset bid data to start a new bid plan
  const resetBidData = async () => {
    const defaultId = `DefaultClient_DefaultOpportunity_Version${new Date().getFullYear()}`; // Dynamic ID
    setLoading(true);
    setError(null);
    try {
      await deleteBidData(selectedBidId); // Delete data from backend
      setBidData(null);
      setSelectedBidId(defaultId); // Set a new default ID
      setCurrentStep(1); // Reset the current step to the first step
      console.log('Bid data reset successfully.');
    } catch (err) {
      console.error('Error resetting bid data:', err);
      setError('Failed to reset bid data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update specific parts of bid data
  const updateBidData = (updates) => {
    setBidData((prevData) => ({
      ...prevData,
      ...updates, // Merge updates into existing data
      team: {
        core: updates.team?.core || prevData?.team?.core || [],
        solution: updates.team?.solution || prevData?.team?.solution || [],
      },
      activities: updates.activities || prevData.activities || {}, // Handle activities
    }));
    console.log('Bid data updated:', updates);
  };

  // Function to update a specific activity
  const updateActivityInContext = async (deliverable, updatedActivity) => {
    try {
      // Update the activity via API
      await updateActivity(selectedBidId, deliverable, updatedActivity);

      // Update the context state
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
    } catch (err) {
      console.error('Error updating activity in context:', err);
      throw err; // Allow error handling at the caller level
    }
  };

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
        updateActivityInContext, // Expose this function
        loading,
        error, // Expose loading and error for UI feedback
      }}
    >
      {children}
    </BidContext.Provider>
  );
};

// Hook to use the Bid Context
export const useBidContext = () => useContext(BidContext);