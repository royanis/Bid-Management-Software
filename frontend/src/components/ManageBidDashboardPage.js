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
  MenuItem,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
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

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const ManageBidDashboardPage = () => {
  const { selectedBidId } = useBidContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState({});

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await getDashboardData(selectedBidId);
      if (!data) throw new Error('No data received.');
      setDashboardData(data);
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
  }, [selectedBidId]);

  // Helper to get today's date in a readable format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Extract clientName and opportunityName from bidId
  const parseBidId = (bidId) => {
    if (!bidId) return { clientName: 'Client', opportunityName: 'Opportunity' };
    const parts = bidId.split('_');
    const clientName = parts[0] || 'Client';
    const opportunityName = parts.slice(1).join(' ') || 'Opportunity';
    return { clientName, opportunityName };
  };

  const { clientName, opportunityName } = parseBidId(selectedBidId);

  // Export to PDF functionality
  const exportToPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const content = document.getElementById('dashboard-content');

    // Add Header
    pdf.setFontSize(16);
    pdf.text(`Bid Summary - ${clientName} ${opportunityName}`, 10, 10);
    pdf.setFontSize(12);
    pdf.text(`Date: ${getCurrentDate()}`, 10, 20);

    // Capture the content using html2canvas
    await html2canvas(content, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
    });

    pdf.save(`Bid_Summary_${clientName}_${opportunityName}.pdf`);
  };

  // Save updated activity
  const handleSave = async (deliverable, idx, updatedActivity) => {
    try {
      await updateActivity(selectedBidId, deliverable, updatedActivity);
      const updatedGroupedActivities = { ...dashboardData.groupedActivities };
      updatedGroupedActivities[deliverable][idx] = updatedActivity;

      setDashboardData((prev) => ({
        ...prev,
        groupedActivities: updatedGroupedActivities,
      }));

      setEditing((prev) => ({
        ...prev,
        [`${deliverable}_${idx}`]: false,
      }));

      // Refresh metrics and charts
      await fetchDashboardData();
    } catch (err) {
      console.error('Error saving activity:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const { metrics, groupedActivities = {}, activitiesByStatus = [] } = dashboardData || {};

  // Data for charts
  const pieChartData = {
    labels: metrics?.completionByTrack?.map((track) => `${track.name} (${track.completionPercentage}%)`),
    datasets: [
      {
        data: metrics?.completionByTrack?.map((track) => track.completionPercentage || 0),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      },
    ],
  };

  const barChartData = {
    labels: metrics?.completionByPerson?.map((person) => person.name),
    datasets: [
      {
        label: 'Completion (%)',
        data: metrics?.completionByPerson?.map((person) => person.completionPercentage),
        backgroundColor: '#36A2EB',
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
      },
      {
        label: 'In Progress',
        data: activitiesByStatus.map((item) => item.statuses['In Progress'] || 0),
        backgroundColor: '#36A2EB',
      },
      {
        label: 'Completed',
        data: activitiesByStatus.map((item) => item.statuses.Completed || 0),
        backgroundColor: '#4BC0C0',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
  };

  return (
    <>
      <Header />
      <Box sx={{ padding: 2 }} id="dashboard-content">
        {/* Metrics Section */}
        <Grid container spacing={2}>
          {[
            { label: 'Total Activities', value: metrics.totalActivities },
            { label: 'Completed Activities', value: metrics.completedActivities },
            { label: 'Pending Activities', value: metrics.totalActivities - metrics.completedActivities },
          ].map((metric, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" textAlign="center">
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" textAlign="center">
                    {metric.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Charts Section */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Completion by Track
                </Typography>
                <div style={{ height: '200px' }}>
                  <Pie data={pieChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Completion by Person
                </Typography>
                <div style={{ height: '200px' }}>
                  <Bar data={barChartData} options={{ ...chartOptions, indexAxis: 'y' }} />
                </div>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Activities by Status (Per Person)
                </Typography>
                <div style={{ height: '200px' }}>
                  <Bar data={activitiesByStatusData} options={{ ...chartOptions, indexAxis: 'y' }} />
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Activities Section */}
        <Grid container>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  Activities Grouped by Deliverables
                </Typography>
                {Object.keys(groupedActivities).map((deliverable, index) => (
                  <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>{deliverable}</Typography>
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
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupedActivities[deliverable].map((activity, idx) => {
                            const isEditing = editing[`${deliverable}_${idx}`];
                            const activityData = isEditing
                              ? editing[`${deliverable}_${idx}`]
                              : activity;

                            return (
                              <TableRow key={idx}>
                                <TableCell>{activity.name}</TableCell>
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
                                    />
                                  ) : (
                                    activity.owner
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      type="date"
                                      value={activityData.dueDate}
                                      onChange={(e) =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: {
                                            ...activityData,
                                            dueDate: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  ) : (
                                    activity.dueDate
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      select
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
                                    >
                                      {['Open', 'In Progress', 'Completed'].map((status) => (
                                        <MenuItem key={status} value={status}>
                                          {status}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  ) : (
                                    activity.status
                                  )}
                                </TableCell>
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
                                    />
                                  ) : (
                                    activity.remarks
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <IconButton
                                      onClick={() => handleSave(deliverable, idx, activityData)}
                                    >
                                      <SaveIcon />
                                    </IconButton>
                                  ) : (
                                    <Button
                                      variant="text"
                                      onClick={() =>
                                        setEditing((prev) => ({
                                          ...prev,
                                          [`${deliverable}_${idx}`]: activity,
                                        }))
                                      }
                                    >
                                      Edit
                                    </Button>
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
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button variant="contained" color="primary" href="/">
          Home
        </Button>
        <Button variant="contained" color="secondary" onClick={exportToPDF}>
          Export to PDF
        </Button>
      </Box>
      <Footer />
    </>
  );
};

export default ManageBidDashboardPage;