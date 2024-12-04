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
} from '@mui/material';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import Header from './Header';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom';
import { useBidContext } from '../context/BidContext';
import { listBidData } from '../services/apiService';

const HomePage = () => {
  const navigate = useNavigate();
  const { resetBidData, setSelectedBidId } = useBidContext();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [savedBids, setSavedBids] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const defaultBidId = `DefaultClient_DefaultOpportunity_Version1`;
      setSelectedBidId(defaultBidId); // Set default if none exists
      navigate(`/manage-bid`);
      console.log('Navigating with bidId:', bidId);
    } else {
      setSelectedBidId(bidId);
      navigate(`/manage-bid`);
      console.log('Navigating with bidId:', bidId);
    }
  };

  const renderDialogContent = (manageMode = false) => {
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
                if (manageMode) {
                  handleManageBid(bid.id);
                } else {
                  handleEditBid(bid.id);
                }
                manageMode ? setManageDialogOpen(false) : setEditDialogOpen(false);
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
                  >
                    Create New Bid Plan
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => setEditDialogOpen(true)}
                  >
                    Edit Existing Bid Plan
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
                <CardActions>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={() => setManageDialogOpen(true)}
                  >
                    Manage Bid
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Edit Bid Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Existing Bid Plan</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search bids..."
            InputProps={{ startAdornment: <SearchIcon sx={{ marginRight: 1 }} /> }}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ marginBottom: 2 }}
          />
          {renderDialogContent(false)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="secondary">
            <CloseIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Bid Dialog */}
      <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)}>
        <DialogTitle>Manage a Bid</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Search bids..."
            InputProps={{ startAdornment: <SearchIcon sx={{ marginRight: 1 }} /> }}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ marginBottom: 2 }}
          />
          {renderDialogContent(true)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)} color="secondary">
            <CloseIcon sx={{ marginRight: 1, verticalAlign: 'middle' }} />
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Footer />
    </>
  );
};

export default HomePage;