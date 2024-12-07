import axios from 'axios';

// Create an Axios instance with default settings
const axiosInstance = axios.create({
  baseURL: 'https://bid-management-software-backend.onrender.com', // Backend server URL (use environment variable if available)
  headers: {
    'Content-Type': 'application/json', // Ensure consistent Content-Type
  },
  withCredentials: true, // Enable credentials for cross-origin requests if needed
});

// Helper function to handle errors consistently
const handleApiError = (error, defaultMessage) => {
  console.error('API Error:', error);
  const errorMessage = error.response?.data?.message || defaultMessage;
  throw new Error(errorMessage);
};

// New: Send a message to the chatbot
export const sendChatbotMessage = async (query) => {
  try {
    const response = await axiosInstance.post('/chatbot', { query });
    return response.data; // { response: "<chatbot reply>" }
  } catch (error) {
    handleApiError(error, 'Failed to communicate with chatbot.');
  }
};

// Create a new bid
export const createBid = async (data) => {
  try {
    const response = await axiosInstance.post('/create-bid', data);
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to create bid.');
  }
};

// Save existing bid data
export const saveBidData = async (data) => {
  try {
    const response = await axiosInstance.post('/save-bid-data', data);
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to save bid data.');
  }
};

// Delete bid data
export const deleteBidData = async (bidId = 'current_bid') => {
  try {
    const response = await axiosInstance.delete('/delete-bid-data', {
      params: { bidId },
    });
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to delete bid data.');
  }
};

// Fetch a list of all saved bids
export const listBidData = async () => {
  try {
    const response = await axiosInstance.get('/list-files', { params: { archived: false } });
    return response.data.files || [];
  } catch (error) {
    handleApiError(error, 'Failed to list bids.');
  }
};

// Fetch archived bids
export const listArchivedBidData = async () => {
  try {
    const response = await axiosInstance.get('/list-files', { params: { archived: true } });
    return response.data.files || [];
  } catch (error) {
    handleApiError(error, 'Failed to list archived bids.');
  }
};

// Fetch specific bid data
export const getBidData = async (bidId = 'current_bid') => {
  try {
    const response = await axiosInstance.get('/get-bid-data', {
      params: { bidId },
    });
    return response.data?.data || null;
  } catch (error) {
    handleApiError(error, 'Failed to fetch bid data.');
  }
};

// Fetch dashboard data
export const getDashboardData = async (bidId) => {
  try {
    const response = await axiosInstance.get('/api/dashboard', { params: { bidId } });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to load dashboard data.');
  }
};

// Fetch actions for a specific deliverable
export const getActions = async (deliverable) => {
  try {
    const response = await axiosInstance.get(`/deliverables/${deliverable}/actions`);
    return response.data.actions || [];
  } catch (error) {
    handleApiError(error, 'Failed to fetch actions.');
  }
};

// Save actions for a specific deliverable
export const saveAction = async (deliverable, actionData) => {
  try {
    const response = await axiosInstance.post(`/deliverables/${deliverable}/actions`, {
      deliverable,
      actionData,
    });
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to save actions.');
  }
};

// Update a specific activity
export const updateActivity = async (bidId, deliverable, updatedActivity) => {
  try {
    const response = await axiosInstance.put(
      `/api/bids/${bidId}/deliverables/${deliverable}/activities`,
      updatedActivity
    );
    return response.data;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// Update specific fields in existing bid data
export const updateBidDataField = async (bidId = 'current_bid', updates) => {
  try {
    const response = await axiosInstance.put('/update-bid-data', { bidId, updates });
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to update bid data.');
  }
};

// Reset all bid data
export const resetAllBidData = async () => {
  try {
    const response = await axiosInstance.post('/reset-bid-data');
    return response.data.message;
  } catch (error) {
    handleApiError(error, 'Failed to reset bid data.');
  }
};

// Fetch activities for a specific deliverable
export const getActivities = async (deliverable) => {
  try {
    const response = await axiosInstance.get(`/deliverables/${deliverable}/activities`);
    return response.data.activities || [];
  } catch (error) {
    handleApiError(error, 'Failed to fetch activities.');
  }
};

// Save activities for a specific deliverable
export const saveActivities = async (deliverable, activities) => {
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

// List all files in the bids folder
export const listFiles = async () => {
  try {
    const response = await axiosInstance.get('/list-files');
    return response.data.files || [];
  } catch (error) {
    handleApiError(error, 'Failed to list files.');
  }
};

// Move a file to the Archive folder
export const moveToArchive = async (fileName) => {
  if (!fileName) {
    throw new Error('File name is required to move to archive.');
  }

  try {
    const response = await axiosInstance.post('/move-to-archive', { fileName });
    return response.data.message;
  } catch (error) {
    handleApiError(error, `Failed to move file '${fileName}' to the archive.`);
  }
};

// Fetch the highest version of a bid
export const getLatestVersion = async (clientName, opportunityName) => {
  try {
    const response = await axiosInstance.get('/get-latest-version', {
      params: { clientName, opportunityName },
    });
    return response.data.version || 1;
  } catch (error) {
    handleApiError(error, 'Failed to fetch the latest version.');
  }
};

// Archive and create a new version
export const archiveAndCreateNewVersion = async (data) => {
  try {
    const response = await axiosInstance.post('/archive-and-new-version', data);
    return response.data.newVersion;
  } catch (error) {
    handleApiError(error, 'Failed to create a new version.');
  }
};