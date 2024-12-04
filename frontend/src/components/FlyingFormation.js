import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  Avatar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch,
  Collapse,
} from '@mui/material';
import { PersonAdd, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useBidContext } from '../context/BidContext';
import { saveBidData, getBidData } from '../services/apiService';
import Header from '../components/Header';
import Footer from '../components/Footer';

const FlyingFormation = () => {
  const navigate = useNavigate();
  const { bidData, setBidData } = useBidContext();

  const [currentTeam, setCurrentTeam] = useState('core');
  const [roles, setRoles] = useState({
    core: [],
    solution: [],
  });
  const [newRole, setNewRole] = useState('');
  const [collapseAddRole, setCollapseAddRole] = useState(false);

  // Fetch bid data on component mount
  useEffect(() => {
    const fetchBidData = async () => {
      try {
        const data = await getBidData(bidData?.bidId || 'current_bid');
        if (data?.team) {
          setRoles(data.team);
        } else {
          // Initialize default roles if no data exists
          setRoles({
            core: [
              { role: 'Deal Lead', name: '' },
              { role: 'Deal Shaper', name: '' },
              { role: 'Deal Coach', name: '' },
              { role: 'Deal Capture', name: '' },
              { role: 'Deal Negotiator', name: '' },
            ],
            solution: [
              { role: 'Solution Architect', name: '' },
              { role: 'Technical Writer', name: '' },
              { role: 'QA Reviewer', name: '' },
              { role: 'Pricing Expert', name: '' },
              { role: 'Orals Coach', name: '' },
            ],
          });
        }
      } catch (error) {
        console.error('Error fetching bid data:', error);
      }
    };

    fetchBidData();
  }, [bidData]);

  const handleNameChange = (index, name) => {
    const updatedRoles = roles[currentTeam].map((role, i) =>
      i === index ? { ...role, name } : role
    );
    setRoles((prevRoles) => ({ ...prevRoles, [currentTeam]: updatedRoles }));
  };

  const addRole = () => {
    if (!newRole.trim()) return;
    setRoles((prevRoles) => ({
      ...prevRoles,
      [currentTeam]: [...prevRoles[currentTeam], { role: newRole, name: '' }],
    }));
    setNewRole('');
    setCollapseAddRole(false);
  };

  const deleteRole = (index) => {
    setRoles((prevRoles) => ({
      ...prevRoles,
      [currentTeam]: prevRoles[currentTeam].filter((_, i) => i !== index),
    }));
  };

  const saveAll = async () => {
    try {
      const updatedBidData = { ...bidData, team: roles };
      await saveBidData(updatedBidData); // Save roles to the bid data
      setBidData(updatedBidData);
      alert('Roles saved successfully!');
    } catch (error) {
      console.error('Error saving roles:', error);
      alert('Failed to save roles. Please try again.');
    }
  };

  const handleNavigation = async (path) => {
    try {
      const updatedBidData = { ...bidData, team: roles };
      await saveBidData(updatedBidData); // Save before navigating
      setBidData(updatedBidData);
      navigate(path);
    } catch (error) {
      console.error('Error navigating:', error);
      alert('Failed to save data before navigation. Please try again.');
    }
  };

  const renderTable = () => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
          <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {roles[currentTeam].map((role, index) => (
          <TableRow key={index}>
            <TableCell>{role.role}</TableCell>
            <TableCell>{role.name || 'Unassigned'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title={`Flying Formation - ${bidData?.opportunityName || 'Bid'}`} />

      <Box sx={{ flex: 1, padding: 4 }}>
        <Typography variant="h4" color="primary" gutterBottom>
          Flying Formation
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Assign roles and names for the bid's core and solution teams.
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              {currentTeam === 'core' ? 'Core Team Roles' : 'Solution Team Roles'}
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflowY: 'auto',
                boxShadow: 2,
                borderRadius: 2,
                padding: 2,
                border: '1px solid #e0e0e0',
              }}
            >
              {renderTable()}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                <Typography variant="h6" sx={{ marginRight: 2 }}>
                  {currentTeam === 'core' ? 'Core Team' : 'Solution Team'}
                </Typography>
                <Switch
                  checked={currentTeam === 'solution'}
                  onChange={() =>
                    setCurrentTeam((prev) => (prev === 'core' ? 'solution' : 'core'))
                  }
                  color="primary"
                />
              </Box>

              <Grid container spacing={2}>
                {roles[currentTeam].map((role, index) => (
                  <Grid item xs={12} key={index}>
                    <Card sx={{ display: 'flex', alignItems: 'center', padding: 1.5 }}>
                      <Avatar
                        sx={{ backgroundColor: 'primary.main', marginRight: 2, width: 36, height: 36 }}
                      >
                        {role.name ? role.name[0].toUpperCase() : <PersonAdd fontSize="small" />}
                      </Avatar>
                      <TextField
                        size="small"
                        label={role.role}
                        value={role.name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        fullWidth
                      />
                      <IconButton
                        color="error"
                        onClick={() => deleteRole(index)}
                        sx={{ marginLeft: 1 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Card>
                  </Grid>
                ))}

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setCollapseAddRole((prev) => !prev)}
                    sx={{ marginBottom: 1 }}
                  >
                    {collapseAddRole ? 'Cancel' : 'Add New Role'}
                  </Button>
                  <Collapse in={collapseAddRole}>
                    <Card
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: 1.5,
                        borderStyle: 'dashed',
                      }}
                    >
                      <TextField
                        size="small"
                        label="Role Name"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        fullWidth
                      />
                      <Button
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={addRole}
                        sx={{ marginLeft: 2 }}
                      >
                        Add
                      </Button>
                    </Card>
                  </Collapse>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', marginTop: 4 }}>
          <Button variant="contained" color="primary" onClick={saveAll}>
            Save All
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, padding: 2 }}>
        <Button variant="outlined" color="primary" onClick={() => handleNavigation('/create-bid')}>
          Previous
        </Button>
        <Button variant="outlined" color="primary" onClick={() => handleNavigation('/')}>
          Home
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleNavigation('/deliverable-activities')}
        >
          Next
        </Button>
      </Box>

      <Footer />
    </Box>
  );
};

export default FlyingFormation;