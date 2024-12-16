// src/services/apiService.js
import axios from 'axios';

// Create an Axios instance with default settings
const axiosInstance = axios.create({
  //baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000', // Replace with your backend URL
  baseURL: 'https://bid-management-software-backend.onrender.com', // Backend server URL (use environment variable if available)
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable credentials if your backend requires them
});

// Helper function to handle errors consistently
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', error);
  const errorMessage = error.response?.data?.message || defaultMessage;
  throw new Error(errorMessage);
};

// -----------------------------
// Bid Management APIs
// -----------------------------

/**
 * Create a new bid.
 * @param {Object} data - Bid details.
 * @returns {Object} - Response data.
 */
const createBid = async (data) => {
  try {
    const response = await axiosInstance.post('/create-bid', data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create bid.');
  }
};

/**
 * Save existing bid data.
 * @param {Object} data - Bid data to save.
 * @returns {String} - Success message.
 */
const saveBidData = async (data) => {
  try {
    const response = await axiosInstance.post('/save-bid-data', data);
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to save bid data.');
  }
};

/**
 * Delete bid data.
 * @param {String} bidId - ID of the bid to delete.
 * @returns {String} - Success message.
 */
const deleteBidData = async (bidId = 'current_bid') => {
  try {
    const response = await axiosInstance.delete('/delete-bid-data', {
      params: { bidId },
    });
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to delete bid data.');
  }
};

/**
 * Fetch a list of all saved bids.
 * @returns {Array} - List of bid files.
 */
const listBidData = async () => {
  try {
    const response = await axiosInstance.get('/list-files', { params: { archived: false } });
    return response.data.files || [];
  } catch (error) {
    handleApiError(error, 'Failed to list bids.');
  }
};

/**
 * Fetch archived bids.
 * @returns {Array} - List of archived bid files.
 */
const listArchivedBidData = async () => {
  try {
    const response = await axiosInstance.get('/list-files', { params: { archived: true } });
    return response.data.files || [];
  } catch (error) {
    handleApiError(error, 'Failed to list archived bids.');
  }
};

/**
 * Fetch specific bid data.
 * @param {String} bidId - ID of the bid to fetch.
 * @returns {Object|null} - Bid data or null if not found.
 */
const getBidData = async (bidId = 'current_bid') => {
  try {
    const response = await axiosInstance.get('/get-bid-data', {
      params: { bidId },
    });
    return response.data?.data || null;
  } catch (error) {
    handleApiError(error, 'Failed to fetch bid data.');
  }
};

/**
 * Fetch dashboard data for a specific bid.
 * @param {String} bidId - ID of the bid.
 * @returns {Object} - Dashboard data.
 */
const getDashboardData = async (bidId) => {
  try {
    const response = await axiosInstance.get('/api/dashboard', { params: { bidId } });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to load dashboard data.');
  }
};

/**
 * Finalize the bid and initialize Action Tracker.
 * @param {Object} bidDetails - Complete bid details.
 * @returns {Object} - Response data from the backend.
 */
const finalizeBid = async (bidDetails) => {
  try {
    const response = await axiosInstance.post('/finalize_bid', { bidDetails });
    return response.data; // Expected: { response: "Bid saved successfully as ... and Action Tracker initialized!" }
  } catch (error) {
    handleApiError(error, 'Failed to finalize bid.');
  }
};

// -----------------------------
// Action Tracker APIs
// -----------------------------

/**
 * Get Action Tracker data for a specific bid.
 * @param {String} bidId - ID of the bid.
 * @returns {Object} - Action Tracker data.
 */
const getActionTrackerData = async (bidId) => {
  try {
    const response = await axiosInstance.get(`/api/action-trackers/${bidId}`);
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, 'Failed to fetch Action Tracker data.');
  }
};

/**
 * Create a new Action Tracker for a bid.
 * @param {String} bidId - ID of the bid.
 * @returns {Object} - Created Action Tracker data.
 */
const createActionTracker = async (bidId) => {
  try {
    const response = await axiosInstance.post('/api/action-trackers', { bidId });
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, 'Failed to create Action Tracker.');
  }
};

/**
 * Update Action Tracker data for a bid.
 * @param {String} bidId - ID of the bid.
 * @param {Object} updatedData - Data to update.
 * @returns {Object} - Updated Action Tracker data.
 */
const updateActionTracker = async (bidId, updatedData) => {
  try {
    const response = await axiosInstance.put(`/api/action-trackers/${bidId}`, updatedData);
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, 'Failed to update Action Tracker.');
  }
};

/**
 * Add a new action to a bid's Action Tracker.
 * @param {String} bidId - ID of the bid.
 * @param {Object} actionData - Data of the action to add.
 * @returns {Object} - Added action data.
 */
const addAction = async (bidId, actionData) => {
  try {
    const response = await axiosInstance.post(`/api/action-trackers/${bidId}/actions`, actionData);
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, 'Failed to add action to Action Tracker.');
  }
};

/**
 * Update a specific action within a bid's Action Tracker.
 * @param {String} bidId - ID of the bid.
 * @param {String} actionId - ID of the action to update.
 * @param {Object} updatedData - Updated action data.
 * @returns {Object} - Updated action data.
 */
const updateSingleAction = async (bidId, actionId, updatedData) => {
  try {
    const response = await axiosInstance.put(`/api/action-trackers/${bidId}/actions/${actionId}`, updatedData);
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, 'Failed to update action.');
  }
};

/**
 * Delete an action from a bid's Action Tracker.
 * @param {String} bidId - ID of the bid.
 * @param {String} actionId - ID of the action to delete.
 * @returns {Object} - Response data.
 */
const deleteAction = async (bidId, actionId) => {
  try {
    const response = await axiosInstance.delete(`/api/action-trackers/${bidId}/actions/${actionId}`);
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, 'Failed to delete action.');
  }
};

// -----------------------------
// Deliverable and Activity APIs
// -----------------------------

/**
 * Fetch activities for a specific deliverable.
 * @param {String} deliverable - Name of the deliverable.
 * @returns {Array} - List of activities.
 */
const getActivities = async (deliverable) => {
  try {
    const response = await axiosInstance.get(`/deliverables/${deliverable}/activities`);
    return response.data.activities || [];
  } catch (error) {
    handleApiError(error, 'Failed to fetch activities.');
  }
};

/**
 * Save activities for a specific deliverable.
 * @param {String} deliverable - Name of the deliverable.
 * @param {Array} activities - List of activities to save.
 * @returns {String} - Success message.
 */
const saveActivities = async (deliverable, activities) => {
  try {
    const response = await axiosInstance.post(`/deliverables/${deliverable}/activities`, {
      deliverable,
      activities,
    });
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to save activities.');
  }
};

/**
 * Update a specific activity.
 * @param {String} bidId - ID of the bid.
 * @param {String} deliverable - Name of the deliverable.
 * @param {Object} updatedActivity - Updated activity data.
 * @returns {String} - Success message.
 */
const updateActivity = async (bidId, deliverable, updatedActivity) => {
  try {
    const response = await axiosInstance.put(
      `/api/bids/${bidId}/deliverables/${deliverable}/activities`,
      updatedActivity
    );
    if (response.data.success) {
      return response.data.message;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// -----------------------------
// File Management APIs
// -----------------------------

/**
 * List all files in the bids folder.
 * @returns {Array} - List of bid files.
 */
const listFiles = async () => {
  try {
    const response = await axiosInstance.get('/list-files');
    return response.data.files || [];
  } catch (error) {
    handleApiError(error, 'Failed to list files.');
  }
};

/**
 * Move a file to the Archive folder.
 * @param {String} fileName - Name of the file to archive.
 * @returns {String} - Success message.
 */
const moveToArchive = async (fileName) => {
  if (!fileName) {
    throw new Error('File name is required to move to archive.');
  }

  try {
    const response = await axiosInstance.post('/move-to-archive', { fileName });
    if (response.data.success) {
      return response.data.message;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    handleApiError(error, `Failed to move file '${fileName}' to the archive.`);
  }
};

// -----------------------------
// Chatbot APIs
// -----------------------------

/**
 * Send a message to the chatbot.
 * @param {String} query - User's message/query.
 * @returns {Object} - Chatbot's response.
 */
const sendChatbotMessage = async (query) => {
  try {
    const response = await axiosInstance.post('/chatbot', { query });
    return response.data; // Expected: { response: "Chatbot reply", suggestions: [...] }
  } catch (error) {
    handleApiError(error, 'Failed to communicate with chatbot.');
  }
};

// -----------------------------
// Reset Bid Data APIs
// -----------------------------

/**
 * Update specific fields in existing bid data.
 * @param {String} bidId - ID of the bid.
 * @param {Object} updates - Fields to update.
 * @returns {String} - Success message.
 */
const updateBidDataField = async (bidId = 'current_bid', updates) => {
  try {
    const response = await axiosInstance.put('/update-bid-data', { bidId, updates });
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to update bid data.');
  }
};

/**
 * Reset all bid data.
 * @returns {String} - Success message.
 */
const resetAllBidData = async () => {
  try {
    const response = await axiosInstance.post('/reset-bid-data');
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to reset bid data.');
  }
};

// -----------------------------
// Optional: Get Latest Version of a Bid
// -----------------------------

/**
 * Fetch the latest version number of a bid based on client and opportunity names.
 * @param {String} clientName - Name of the client.
 * @param {String} opportunityName - Name of the opportunity.
 * @returns {Number} - Latest version number.
 */
const getLatestVersion = async (clientName, opportunityName) => {
  try {
    const response = await axiosInstance.get('/get-latest-version', {
      params: { clientName, opportunityName },
    });
    return response.data.version || 1;
  } catch (error) {
    handleApiError(error, 'Failed to fetch the latest version.');
  }
};

/**
 * Archive and create a new version of a bid.
 * @param {Object} data - Data required to archive and create a new version.
 * @returns {Number} - New version number.
 */
const archiveAndCreateNewVersion = async (data) => {
  try {
    const response = await axiosInstance.post('/archive-and-new-version', data);
    return response.data.newVersion;
  } catch (error) {
    handleApiError(error, 'Failed to create a new version.');
  }
};

// -----------------------------
// Export all functions
// -----------------------------

export {
  createBid,
  saveBidData,
  deleteBidData,
  listBidData,
  listArchivedBidData,
  getBidData,
  getDashboardData,
  finalizeBid, // Ensure finalizeBid is exported
  getActionTrackerData,
  createActionTracker,
  updateActionTracker,
  addAction,
  updateSingleAction,
  deleteAction,
  getActivities,
  saveActivities,
  updateActivity,
  updateBidDataField,
  resetAllBidData,
  archiveAndCreateNewVersion,
  listFiles,
  moveToArchive,
  sendChatbotMessage
};

// Export the Axios instance as the default export
export default axiosInstance;