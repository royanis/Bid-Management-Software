// src/components/ManageBidDashboardPage.js

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Tooltip,
  Chip,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';
import DownloadIcon from '@mui/icons-material/Download';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useBidContext } from '../context/BidContext';
import { getDashboardData, updateActivity } from '../services/apiService';
import Header from './Header';
import Footer from './Footer';
import { useNavigate } from 'react-router-dom';
import { parseISO, isValid, format } from 'date-fns';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

/**
 * Formats the endDate for display.
 * @param {string} endDate - The endDate string from the activity.
 * @returns {string} - Formatted date or fallback message.
 */
const formatEndDate = (endDate) => {
  if (!endDate) return 'Date Not Available';
  const date = parseISO(endDate);
  if (!isValid(date)) return 'Date Not Available';
  return format(date, 'MMMM dd, yyyy'); // e.g., "December 18, 2024"
};

const ManageBidDashboardPage = () => {
  const { selectedBidId, actionTrackerData } = useBidContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData(selectedBidId);
      if (!data) throw new Error('No data received.');

      // Remove 'end_date' from all activities
      const cleanedGroupedActivities = {};
      if (data.activities) {
        Object.keys(data.activities).forEach((deliverable) => {
          cleanedGroupedActivities[deliverable] = data.activities[deliverable].map((activity) => {
            const { end_date, ...rest } = activity; // Exclude 'end_date'
            return rest;
          });
        });
      }

      setDashboardData({ ...data, activities: cleanedGroupedActivities });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBidId) fetchDashboardData();
    else {
      setError('No bid ID selected.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBidId]);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const parseBidId = (bidId) => {
    if (!bidId)
      return { clientName: 'Client', opportunityName: 'Opportunity', version: 'Version1' };
    const parts = bidId.split('_');
    const clientName = parts[0] || 'Client';
    const opportunityName = parts.slice(1, parts.length - 1).join(' ') || 'Opportunity';
    const version = parts[parts.length - 1] || 'Version1';
    return { clientName, opportunityName, version };
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <CircularProgress color="primary" size={80} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const { clientName, opportunityName, version } = parseBidId(selectedBidId);
  const { metrics, groupedActivities = {}, activitiesByStatus = [] } = dashboardData || {};

  const exportToPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const content = document.getElementById('dashboard-content');
    pdf.setFontSize(16);
    pdf.text(`Bid Summary - ${clientName} ${opportunityName}`, 10, 10);
    pdf.setFontSize(12);
    pdf.text(`Date: ${getCurrentDate()}`, 10, 20);

    await html2canvas(content, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
    });

    pdf.save(`Bid_Summary_${clientName}_${opportunityName}.pdf`);
  };

  const handleSave = async (deliverable, idx, updatedActivity) => {
    try {
      // Convert 'YYYY-MM-DD' to ISO string if necessary
      const isoEndDate =
        updatedActivity.endDate && !updatedActivity.endDate.includes('T')
          ? new Date(updatedActivity.endDate).toISOString()
          : updatedActivity.endDate;

      // Prepare the activity to save by excluding 'end_date'
      const { end_date, ...activityToSave } = { ...updatedActivity, endDate: isoEndDate };

      await updateActivity(selectedBidId, deliverable, activityToSave);

      // Re-fetch the dashboard data to update metrics and charts
      await fetchDashboardData();

      // Close the editing state
      setEditing((prev) => ({
        ...prev,
        [`${deliverable}_${idx}`]: false,
      }));

      // Display success snackbar
      setSnackbar({
        open: true,
        message: 'Activity saved successfully!',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error saving activity:', err);
      // Display error snackbar
      setSnackbar({
        open: true,
        message: 'Failed to save activity. Please try again.',
        severity: 'error',
      });
    }
  };

  // Charts data
  const completionByTrackData = {
    labels: (metrics?.completionByTrack || []).map((d) => d.name),
    datasets: [
      {
        data: (metrics?.completionByTrack || []).map((d) => d.value),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
        hoverBackgroundColor: ['#FF6384CC', '#36A2EBCC', '#FFCE56CC', '#4BC0C0CC'],
      },
    ],
  };

  const completionByPersonData = {
    labels: (metrics?.completionByPerson || []).map((p) => p.name),
    datasets: [
      {
        label: 'Completion Percentage',
        data: (metrics?.completionByPerson || []).map((p) => p.completionPercentage),
        backgroundColor: '#36A2EB',
        hoverBackgroundColor: '#36A2EBCC',
      },
    ],
  };

  const activitiesByStatusData = {
    labels: activitiesByStatus.map((item) => item.owner),
    datasets: [
      {
        label: 'Open',
        data: activitiesByStatus.map((item) => item.statuses.Open || 0),
        backgroundColor: '#FFCE56',
        hoverBackgroundColor: '#FFCE56CC',
      },
      {
        label: 'In Progress',
        data: activitiesByStatus.map((item) => item.statuses['In Progress'] || 0),
        backgroundColor: '#36A2EB',
        hoverBackgroundColor: '#36A2EBCC',
      },
      {
        label: 'Completed',
        data: activitiesByStatus.map((item) => item.statuses.Completed || 0),
        backgroundColor: '#4BC0C0',
        hoverBackgroundColor: '#4BC0C0CC',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  // Modern navigation to action tracker: A prominent button placed near the top
  const actionTrackerButton = (
    <Tooltip title="Go to Action Tracker" arrow>
      <Button
        variant="contained"
        color="info"
        endIcon={<ArrowForwardIcon />}
        onClick={() => navigate('/action-tracker')}
        sx={{
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
      >
        Manage Actions
      </Button>
    </Tooltip>
  );

  // Metrics Cards with Icons
  const metricsCards = [
    {
      label: 'Total Activities',
      value: metrics.totalActivities,
      icon: <ArrowForwardIcon fontSize="large" color="primary" />,
      color: '#1976d2',
    },
    {
      label: 'Completed Activities',
      value: metrics.completedActivities,
      icon: <SaveIcon fontSize="large" color="success" />,
      color: '#388e3c',
    },
    {
      label: 'Pending Activities',
      value: metrics.totalActivities - metrics.completedActivities,
      icon: <ArrowForwardIcon fontSize="large" color="warning" />,
      color: '#f57c00',
    },
    // Add more metrics if needed
  ];

  return (
    <>
      <Header />

      <Box
        sx={{ padding: isMobile ? 1 : 4 }}
        id="dashboard-content"
        bgcolor={theme.palette.background.paper}
      >

        {/* Bid Information Section */}
        <Paper elevation={4} sx={{ padding: 3, mb: 4, position: 'relative', borderRadius: 2 }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} color="primary" gutterBottom>
            Bid Information
          </Typography>
          {/* Action Tracker Button */}
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            {actionTrackerButton}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body1">
                <strong>Bid ID:</strong> {selectedBidId}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body1">
                <strong>Client:</strong> {clientName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body1">
                <strong>Opportunity:</strong> {opportunityName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body1">
                <strong>Generated On:</strong> {getCurrentDate()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Metrics Section */}
        <Grid container spacing={3}>
          {metricsCards.map((metric, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                  backgroundColor: metric.color,
                  color: '#fff',
                  borderRadius: 2,
                  boxShadow: 3,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <Box sx={{ mr: 2 }}>{metric.icon}</Box>
                <Box>
                  <Typography variant="subtitle1">{metric.label}</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {metric.value}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}

          {/* Action Tracker Metrics (if available) */}
          {actionTrackerData && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                    backgroundColor: '#8e24aa',
                    color: '#fff',
                    borderRadius: 2,
                    boxShadow: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    <ArrowForwardIcon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1">Total Actions</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {actionTrackerData.totalActions}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                    backgroundColor: '#c62828',
                    color: '#fff',
                    borderRadius: 2,
                    boxShadow: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    <SaveIcon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1">Open Actions</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {actionTrackerData.openActions}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 2,
                    backgroundColor: '#2e7d32',
                    color: '#fff',
                    borderRadius: 2,
                    boxShadow: 3,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    <ArrowForwardIcon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1">Closed Actions</Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {actionTrackerData.closedActions}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            </>
          )}
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Charts Section */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Completion by Track
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Pie data={completionByTrackData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Completion by Person
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar data={completionByPersonData} options={{ ...chartOptions, indexAxis: 'y' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Activities by Status (Per Person)
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar data={activitiesByStatusData} options={{ ...chartOptions, indexAxis: 'y' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Activities Section */}
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card elevation={3} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Activities Grouped by Deliverables
                </Typography>
                {Object.keys(groupedActivities).map((deliverable, index) => (
                  <Accordion key={index} sx={{ mb: 2, borderRadius: 1 }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{ backgroundColor: '#f5f5f5' }}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {deliverable}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Activity</TableCell>
                            <TableCell>Owner</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Remarks</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupedActivities[deliverable].map((activity, idx) => {
                            const isEditing = editing[`${deliverable}_${idx}`];
                            const activityData = isEditing
                              ? editing[`${deliverable}_${idx}`]
                              : activity;

                            // Define status options
                            const statusOptions = ['Open', 'In Progress', 'Completed'];

                            return (
                              <TableRow
                                key={idx}
                                sx={{
                                  backgroundColor: idx % 2 === 0 ? '#fafafa' : '#fff',
                                  transition: 'background-color 0.3s',
                                  '&:hover': {
                                    backgroundColor: '#f0f0f0',
                                  },
                                }}
                              >
                                {/* Activity Name */}
                                <TableCell>{activityData.name}</TableCell>

                                {/* Owner */}
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      value={activityData.owner}
                                      onChange={(e) =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: {
                                            ...activityData,
                                            owner: e.target.value,
                                          },
                                        }))
                                      }
                                      variant="standard"
                                      fullWidth
                                    />
                                  ) : (
                                    activity.owner
                                  )}
                                </TableCell>

                                {/* End Date */}
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      type="date"
                                      value={activityData.endDate ? activityData.endDate.substring(0, 10) : ''}
                                      onChange={(e) =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: {
                                            ...activityData,
                                            endDate: e.target.value, // 'YYYY-MM-DD'
                                          },
                                        }))
                                      }
                                      InputLabelProps={{ shrink: true }}
                                      variant="standard"
                                      fullWidth
                                    />
                                  ) : (
                                    formatEndDate(activity.endDate)
                                  )}
                                </TableCell>

                                {/* Status */}
                                <TableCell>
                                  {isEditing ? (
                                    <Select
                                      value={activityData.status}
                                      onChange={(e) =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: {
                                            ...activityData,
                                            status: e.target.value,
                                          },
                                        }))
                                      }
                                      variant="standard"
                                      fullWidth
                                    >
                                      {statusOptions.map((status) => (
                                        <MenuItem key={status} value={status}>
                                          {status}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Chip
                                      label={activity.status}
                                      color={
                                        activity.status === 'Completed'
                                          ? 'success'
                                          : activity.status === 'In Progress'
                                          ? 'warning'
                                          : 'default'
                                      }
                                      variant="outlined"
                                    />
                                  )}
                                </TableCell>

                                {/* Remarks */}
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      value={activityData.remarks}
                                      onChange={(e) =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: {
                                            ...activityData,
                                            remarks: e.target.value,
                                          },
                                        }))
                                      }
                                      variant="standard"
                                      fullWidth
                                    />
                                  ) : (
                                    activity.remarks
                                  )}
                                </TableCell>

                                {/* Actions */}
                                <TableCell align="center">
                                  {isEditing ? (
                                    <IconButton
                                      color="primary"
                                      onClick={() => handleSave(deliverable, idx, activityData)}
                                      sx={{
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                          transform: 'scale(1.2)',
                                        },
                                      }}
                                      aria-label="save"
                                    >
                                      <SaveIcon />
                                    </IconButton>
                                  ) : (
                                    <IconButton
                                      color="primary"
                                      onClick={() =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: activity,
                                        }))
                                      }
                                      sx={{
                                        transition: 'transform 0.2s',
                                        '&:hover': {
                                          transform: 'scale(1.2)',
                                        },
                                      }}
                                      aria-label="edit"
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Home and Export Buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'flex-end',
          gap: 2,
          mt: 4,
          padding: isMobile ? 1 : 4,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<HomeIcon />}
          href="/"
          sx={{
            paddingX: 3,
            paddingY: 1.5,
            borderRadius: 2,
            transition: 'background-color 0.3s',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          Home
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<DownloadIcon />}
          onClick={exportToPDF}
          sx={{
            paddingX: 3,
            paddingY: 1.5,
            borderRadius: 2,
            transition: 'background-color 0.3s',
            '&:hover': {
              backgroundColor: theme.palette.secondary.dark,
            },
          }}
        >
          Export to PDF
        </Button>
      </Box>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Footer />
    </>
  );
};

export default ManageBidDashboardPage;