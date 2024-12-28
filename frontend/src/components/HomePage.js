// src/components/HomePage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import Header from './Header';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom';
import { useBidContext } from '../context/BidContext';
import { listBidData, deleteBidData } from '../services/apiService'; // Added deleteBidData
import axios from 'axios'; // Added for API calls

const HomePage = () => {
  const navigate = useNavigate();
  const { resetBidData, setSelectedBidId } = useBidContext();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [workshopDialogOpen, setWorkshopDialogOpen] = useState(false); // New dialog state for Workshop
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // New dialog state for Deletion
  const [savedBids, setSavedBids] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // New state variables for deletion
  const [bidToDelete, setBidToDelete] = useState(null);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [selectedBidName, setSelectedBidName] = useState('');

  // Snackbar State for Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch saved bids on component mount
  useEffect(() => {
    const fetchSavedBids = async () => {
      setLoading(true);
      setError('');
      try {
        const bids = await listBidData();
        setSavedBids(bids || []);
      } catch (err) {
        console.error('Error fetching saved bids:', err);
        setError('Failed to load saved bids. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedBids();
  }, []);

  const handleCreateNewBid = () => {
    resetBidData();
    navigate('/create-bid');
  };

  const handleEditBid = (bidId) => {
    setSelectedBidId(bidId); // Update context with the selected bid ID
    navigate('/create-bid', { state: { bidId } }); // Pass bidId in state
  };

  const handleManageBid = (bidId) => {
    if (!bidId) {
      setSnackbar({ open: true, message: 'No bids available. Please create a new bid first.', severity: 'warning' });
      return;
    }
    setSelectedBidId(bidId);
    navigate(`/manage-bid`);
    console.log('Navigating with bidId:', bidId);
  };

  const handleConductWorkshop = (bidId) => {
    setSelectedBidId(bidId);
    navigate(`/win-theme-workshop/${bidId}`);
  };

  // Handler for Snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handler for Delete Confirmation
  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      // Assuming deleteBidData is defined in apiService.js
      const response = await deleteBidData(bidToDelete);
      if (response.success) {
        setSnackbar({ open: true, message: response.message || 'Bid plan deleted successfully.', severity: 'success' });
        // Remove the deleted bid from savedBids state
        setSavedBids((prevBids) => prevBids.filter((bid) => bid.id !== bidToDelete));
      } else {
        setSnackbar({ open: true, message: response.message || 'Failed to delete bid plan.', severity: 'error' });
      }
    } catch (err) {
      console.error('Error deleting bid plan:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'An error occurred while deleting the bid plan.', severity: 'error' });
    } finally {
      setLoading(false);
      setConfirmationDialogOpen(false);
      setDeleteDialogOpen(false);
      setBidToDelete(null);
      setSelectedBidName('');
      setSearchQuery(''); // Reset search query after deletion
    }
  };

  // Handler for opening confirmation dialog
  const handleDeleteConfirmation = (bidId, bidName) => {
    setSelectedBidName(bidName);
    setConfirmationMessage(`Are you sure you want to delete the bid plan "${bidName}"? This action cannot be undone.`);
    setBidToDelete(bidId);
    setConfirmationDialogOpen(true);
  };

  // Function to render dialog content based on mode
  const renderDialogContent = (manageMode = false, customSelectionHandler = null) => {
    const filteredBids = savedBids.filter((bid) =>
      `${bid.clientName} ${bid.opportunityName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    if (loading) {
      return <CircularProgress />;
    }

    if (error) {
      return (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      );
    }

    if (filteredBids.length > 0) {
      return (
        <List>
          {filteredBids.map((bid) => (
            <ListItem
              key={bid.id}
              button
              onClick={() => {
                if (customSelectionHandler) {
                  customSelectionHandler(bid.id);
                  setWorkshopDialogOpen(false);
                } else {
                  if (manageMode) {
                    handleManageBid(bid.id);
                    setManageDialogOpen(false);
                  } else {
                    handleEditBid(bid.id);
                    setEditDialogOpen(false);
                  }
                }
              }}
            >
              <ListItemText
                primary={`${bid.clientName} - ${bid.opportunityName}`}
                secondary={`Last Modified: ${new Date(bid.lastModified).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      );
    }

    return (
      <Typography variant="body2" color="textSecondary">
        No saved bids found. Try searching or create a new one to get started.
      </Typography>
    );
  };

  // Function to render delete dialog content
  const renderDeleteDialogContent = () => {
    const filteredBids = savedBids.filter((bid) =>
      `${bid.clientName} ${bid.opportunityName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    if (loading) {
      return <CircularProgress />;
    }

    if (error) {
      return (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      );
    }

    if (filteredBids.length > 0) {
      return (
        <List>
          {filteredBids.map((bid) => (
            <ListItem
              key={bid.id}
              button
              onClick={() => {
                handleDeleteConfirmation(bid.id, `${bid.clientName} - ${bid.opportunityName}`);
              }}
            >
              <ListItemText
                primary={`${bid.clientName} - ${bid.opportunityName}`}
                secondary={`Last Modified: ${new Date(bid.lastModified).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      );
    }

    return (
      <Typography variant="body2" color="textSecondary">
        No saved bids found. Try searching or create a new one to get started.
      </Typography>
    );
  };

  return (
    <>
      <Header title="Welcome to Bid Management System" />

      <Box
        sx={{
          flex: 1,
          backgroundImage: 'url(/background-image.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 4,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 3,
            padding: 4,
            boxShadow: 5,
          }}
        >
          <Typography variant="h4" color="primary" gutterBottom>
            Efficiently Manage Your Bids
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Take control of your bid creation and lifecycle management.
          </Typography>

          <Grid container spacing={4} justifyContent="center" sx={{ marginTop: 4 }}>
            {/* Create Bid Plans Section */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  boxShadow: 5,
                  textAlign: 'center',
                  padding: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <CardContent>
                  <Typography variant="h5" color="primary" gutterBottom>
                    <CreateNewFolderIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
                    Create Bid Plans
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Start new bid plans or continue where you left off.
                  </Typography>
                </CardContent>
                <CardActions
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={handleCreateNewBid}
                    aria-label="Create New Bid Plan"
                  >
                    Create New Bid Plan
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => setEditDialogOpen(true)}
                    aria-label="Edit Existing Bid Plan"
                  >
                    Edit Existing Bid Plan
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    fullWidth
                    onClick={() => setDeleteDialogOpen(true)}
                    aria-label="Delete Bid Plan"
                  >
                    Delete Bid Plan
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Manage a Bid Section */}
            <Grid item xs={12} md={6}>
              <Card
                sx={{
                  boxShadow: 5,
                  textAlign: 'center',
                  padding: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <CardContent>
                  <Typography variant="h5" color="primary" gutterBottom>
                    <ManageAccountsIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
                    Manage a Bid
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Track and manage bid lifecycles with detailed dashboards.
                  </Typography>
                </CardContent>
                <CardActions sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => {
                      if (savedBids.length === 0) {
                        setSnackbar({ open: true, message: 'No bids available. Please create a new bid first.', severity: 'warning' });
                      } else {
                        setManageDialogOpen(true);
                      }
                    }}
                    aria-label="Manage Bid"
                  >
                    Manage Bid
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={() => {
                      if (savedBids.length === 0) {
                        setSnackbar({ open: true, message: 'No bids available. Please create a new bid first.', severity: 'warning' });
                      } else {
                        setWorkshopDialogOpen(true);
                      }
                    }}
                    aria-label="Conduct Win Theme Workshop"
                  >
                    Conduct Win Theme Workshop
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Edit Bid Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} aria-labelledby="edit-bid-dialog-title">
        <DialogTitle id="edit-bid-dialog-title">Edit Existing Bid Plan</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search bids..."
            InputProps={{ startAdornment: <SearchIcon sx={{ marginRight: 1 }} /> }}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ marginBottom: 2 }}
            aria-label="Search bids to edit"
          />
          {renderDialogContent(false)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="secondary" aria-label="Close Edit Dialog">
            <CloseIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Bid Dialog */}
      <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)} aria-labelledby="manage-bid-dialog-title">
        <DialogTitle id="manage-bid-dialog-title">Manage a Bid</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search bids..."
            InputProps={{ startAdornment: <SearchIcon sx={{ marginRight: 1 }} /> }}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ marginBottom: 2 }}
            aria-label="Search bids to manage"
          />
          {renderDialogContent(true)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)} color="secondary" aria-label="Close Manage Dialog">
            <CloseIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conduct Win Theme Workshop Dialog */}
      <Dialog open={workshopDialogOpen} onClose={() => setWorkshopDialogOpen(false)} aria-labelledby="workshop-dialog-title">
        <DialogTitle id="workshop-dialog-title">Conduct Win Theme Workshop</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Select a bid to conduct the workshop..."
            InputProps={{ startAdornment: <SearchIcon sx={{ marginRight: 1 }} /> }}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ marginBottom: 2 }}
            aria-label="Search bids to conduct workshop"
          />
          {/* Pass the custom handler for workshop selection */}
          {renderDialogContent(false, handleConductWorkshop)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkshopDialogOpen(false)} color="secondary" aria-label="Close Workshop Dialog">
            <CloseIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Bid Plan Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-bid-dialog-title"
      >
        <DialogTitle id="delete-bid-dialog-title">Delete Bid Plan</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search bids to delete..."
            InputProps={{ startAdornment: <SearchIcon sx={{ marginRight: 1 }} /> }}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ marginBottom: 2 }}
            aria-label="Search bids to delete"
          />
          {renderDeleteDialogContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="secondary" aria-label="Cancel Deletion">
            <CloseIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialogOpen}
        onClose={() => setConfirmationDialogOpen(false)}
        aria-labelledby="confirmation-dialog-title"
      >
        <DialogTitle id="confirmation-dialog-title">Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>{confirmationMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationDialogOpen(false)} color="secondary" aria-label="Cancel Deletion">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" aria-label="Confirm Deletion">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for User Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Footer />
    </>
  );
};

export default HomePage;