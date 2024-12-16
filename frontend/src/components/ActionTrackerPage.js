// src/components/ActionTrackerPage.js

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Paper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Avatar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Pie, Bar } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import { useBidContext } from '../context/BidContext';
import Header from './Header';
import Footer from './Footer';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
} from '@mui/lab';
import { green, blue, orange, yellow } from '@mui/material/colors';
import { parseISO, parse, isValid, format } from 'date-fns';
import { Chart, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

// Register Chart.js components
Chart.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement);

// Utility Functions

/**
 * Attempts to parse a date string using multiple formats.
 * @param {string} dateString - The date string to parse.
 * @returns {Date|null} - The parsed Date object or null if parsing fails.
 */
const parseDateString = (dateString) => {
  if (!dateString) return null;

  // Attempt to parse as ISO 8601
  let parsedDate = parseISO(dateString);
  if (isValid(parsedDate)) return parsedDate;

  // Attempt to parse as 'dd/MM/yyyy, h:mm:ss a'
  parsedDate = parse(dateString, 'dd/MM/yyyy, h:mm:ss a', new Date());
  if (isValid(parsedDate)) return parsedDate;

  // Add more formats here if needed

  // If all parsing attempts fail, return null
  return null;
};

/**
 * Formats a date string into a readable format.
 * @param {string} dateString - The original date string.
 * @returns {string} - The formatted date string or the original string if parsing fails.
 */
const formatDate = (dateString) => {
  const date = parseDateString(dateString);
  return date ? format(date, 'MMMM dd, yyyy') : dateString;
};

/**
 * Formats only the time portion of a date string.
 * @param {string} dateString - The original date string.
 * @returns {string} - The formatted time string or the original string if parsing fails.
 */
const formatTime = (dateString) => {
  const date = parseDateString(dateString);
  return date ? format(date, 'hh:mm a') : dateString;
};

/**
 * Formats the date part for grouping.
 * @param {string} dateString - The original date string.
 * @returns {string} - The formatted date for grouping or 'Unknown Date' if parsing fails.
 */
const formatGroupDate = (dateString) => {
  const date = parseDateString(dateString);
  return date ? format(date, 'MMMM dd, yyyy') : 'Unknown Date';
};

const ActionTrackerPage = () => {
  const {
    selectedBidId,
    actionTrackerData,
    setActionTrackerData,
    addNewAction,
    updateExistingAction,
    deleteExistingAction,
    getActionTrackerData,
    showSnackbar,
  } = useBidContext();

  const [editing, setEditing] = useState({});
  const [actionForm, setActionForm] = useState({
    name: '',
    deliverable: '',
    owner: '',
    endDate: '',
    status: 'Pending',
    remarks: '',
  });
  const [addingAction, setAddingAction] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [actionToDelete, setActionToDelete] = useState(null);

  // For action history dialog
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historyActionId, setHistoryActionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Filters for the actions list
  const [filterDeliverable, setFilterDeliverable] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOwner, setFilterOwner] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    refreshActionTrackerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBidId]);

  const refreshActionTrackerData = async () => {
    try {
      const data = await getActionTrackerData(selectedBidId);
      if (data) {
        setActionTrackerData(data);
      } else {
        setActionTrackerData(null);
      }
    } catch (err) {
      console.error('Error refreshing Action Tracker data:', err);
      showSnackbar('Failed to refresh Action Tracker data.', 'error');
    }
  };

  const getCurrentDate = () => {
    const today = new Date();
    return format(today, 'MMMM dd, yyyy');
  };

  const parseBidId = (bidId) => {
    if (!bidId) return { clientName: 'Client', opportunityName: 'Opportunity', version: 'Version1' };
    const parts = bidId.split('_');
    const clientName = parts[0] || 'Client';
    const opportunityName = parts.slice(1, parts.length - 1).join(' ') || 'Opportunity';
    const version = parts[parts.length - 1] || 'Version1';
    return { clientName, opportunityName, version };
  };

  const { clientName, opportunityName } = parseBidId(selectedBidId);

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const content = document.getElementById('action-tracker-content');

      if (!content) {
        showSnackbar('Action Tracker content not found for PDF export.', 'error');
        return;
      }

      pdf.setFontSize(16);
      pdf.text(`Action Tracker - ${clientName} ${opportunityName}`, 10, 10);
      pdf.setFontSize(12);
      pdf.text(`Date: ${getCurrentDate()}`, 10, 20);

      const canvas = await html2canvas(content, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
      pdf.save(`Action_Tracker_${clientName}_${opportunityName}.pdf`);
      showSnackbar('PDF exported successfully!', 'success');
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      showSnackbar('Failed to export PDF. Please try again.', 'error');
    }
  };

  const handleActionFormChange = (e) => {
    const { name, value } = e.target;
    setActionForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddAction = async () => {
    const { name, deliverable, owner, endDate, status } = actionForm;
    if (!name || !deliverable || !owner || !endDate || !status) {
      showSnackbar('Please fill in all required fields.', 'warning');
      return;
    }

    setAddingAction(true);
    try {
      const newAction = {
        name: name.trim(),
        deliverable: deliverable.trim(),
        owner: owner.trim(),
        endDate: new Date(endDate).toISOString(),
        status: status.trim(),
        remarks: actionForm.remarks.trim() || '',
        createdDate: new Date().toISOString(),
        changedBy: 'user',
      };

      await addNewAction(newAction);
      showSnackbar('Action added successfully!', 'success');

      setActionForm({
        name: '',
        deliverable: '',
        owner: '',
        endDate: '',
        status: 'Pending',
        remarks: '',
      });

      await refreshActionTrackerData();
    } catch (err) {
      console.error('Error adding action:', err);
      showSnackbar('Failed to add action. Please try again.', 'error');
    } finally {
      setAddingAction(false);
    }
  };

  const handleEditAction = (action) => {
    setEditing((prev) => ({
      ...prev,
      [action.actionId]: action,
    }));
  };

  // Compare old and new action fields to record changes
  const getChangedFields = (oldAction, newAction) => {
    const fieldsToCheck = ['deliverable', 'owner', 'endDate', 'status', 'remarks'];
    const changes = [];

    fieldsToCheck.forEach((field) => {
      if (oldAction[field] !== newAction[field]) {
        changes.push({
          field,
          oldValue: oldAction[field] || '',
          newValue: newAction[field] || '',
        });
      }
    });

    return changes;
  };

  const handleSaveEditedAction = async (actionId, updatedAction) => {
    try {
      const oldAction = actionTrackerData.actionsByDeliverable[updatedAction.deliverable]
        ? actionTrackerData.actionsByDeliverable[updatedAction.deliverable].find(a => a.actionId === actionId)
        : null;

      let oldActionData = oldAction;
      // If oldAction not found in same deliverable (because deliverable changed), search in all
      if (!oldActionData) {
        for (const deliv in actionTrackerData.actionsByDeliverable) {
          const found = actionTrackerData.actionsByDeliverable[deliv].find(a => a.actionId === actionId);
          if (found) {
            oldActionData = { ...found };
            break;
          }
        }
      }

      if (!oldActionData) {
        // Fallback to editing state
        oldActionData = editing[actionId];
      }

      const changedFields = getChangedFields(oldActionData, updatedAction);

      await updateExistingAction(actionId, {
        ...updatedAction,
        changedFields,
        changedDate: new Date().toISOString(),
        changedBy: 'user',
      });
      showSnackbar('Action updated successfully!', 'success');

      setEditing((prev) => {
        const newEditing = { ...prev };
        delete newEditing[actionId];
        return newEditing;
      });

      await refreshActionTrackerData();
    } catch (err) {
      console.error('Error updating action:', err);
      showSnackbar('Failed to update action. Please try again.', 'error');
    }
  };

  const handleOpenDeleteDialog = (actionId) => {
    setActionToDelete(actionId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialogFunc = () => {
    setOpenDeleteDialog(false);
    setActionToDelete(null);
  };

  const handleConfirmDeleteAction = async () => {
    try {
      await deleteExistingAction(actionToDelete);
      showSnackbar('Action deleted successfully!', 'success');
      await refreshActionTrackerData();
    } catch (err) {
      console.error('Error deleting action:', err);
      showSnackbar('Failed to delete action. Please try again.', 'error');
    } finally {
      handleCloseDeleteDialogFunc();
    }
  };

  const handleOpenHistoryDialog = (actionId) => {
    setHistoryActionId(actionId);
    setOpenHistoryDialog(true);
  };

  const handleCloseHistoryDialog = () => {
    setOpenHistoryDialog(false);
    setHistoryActionId(null);
    setSearchTerm('');
    setFilterType('All');
  };

  // Prepare chart data with updated statuses
  const prepareChartData = () => {
    if (!actionTrackerData) return {};

    const { actionsByDeliverable, owners } = actionTrackerData;

    // Flatten actions from actionsByDeliverable
    let actions = [];
    if (actionsByDeliverable) {
      actions = Object.values(actionsByDeliverable).flat();
    }

    // Compute counts for each status
    const pendingActions = actions.filter(action => action.status === 'Pending').length;
    const inProgressActions = actions.filter(action => action.status === 'In Progress').length;
    const completedActions = actions.filter(action => action.status === 'Completed').length;

    const actionsByStatusData = {
      labels: ['Pending', 'In Progress', 'Completed'],
      datasets: [
        {
          data: [pendingActions, inProgressActions, completedActions],
          backgroundColor: ['#FFCE56', '#36A2EB', '#4BC0C0'], // Customize colors as desired
          hoverOffset: 4,
        },
      ],
    };

    // Actions by Deliverable
    const deliverables = Object.keys(actionsByDeliverable || {});
    const deliverableCounts = Object.values(actionsByDeliverable || {}).map(arr => arr.length);

    const actionsByDeliverableData = {
      labels: deliverables,
      datasets: [
        {
          label: 'Number of Actions',
          data: deliverableCounts,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'], // Add more colors if needed
        },
      ],
    };

    // Actions by Owner
    const actionOwnerCounts = (owners || []).map(owner => {
      let count = 0;
      actions.forEach(action => {
        if (action.owner === owner) count += 1;
      });
      return count;
    });

    const actionsByOwnerData = {
      labels: owners || [],
      datasets: [
        {
          label: 'Number of Actions',
          data: actionOwnerCounts,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'], // Add more colors if needed
        },
      ],
    };

    return {
      actionsByStatusData,
      actionsByDeliverableData,
      actionsByOwnerData,
    };
  };

  const { actionsByStatusData, actionsByDeliverableData, actionsByOwnerData } = prepareChartData() || {};
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
  };

  // Flatten actions from actionsByDeliverable
  let actions = [];
  if (actionTrackerData?.actionsByDeliverable) {
    actions = Object.values(actionTrackerData.actionsByDeliverable).flat();
  }

  const selectedActionHistory = historyActionId
    ? actionTrackerData?.actionHistory?.[historyActionId] || []
    : [];

  // Sort the history with latest changes first
  selectedActionHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter and search logic
  const filteredHistory = selectedActionHistory.filter(entry => {
    const matchesSearch =
      entry.change.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.changedFields && entry.changedFields.some(cf =>
        cf.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cf.oldValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cf.newValue.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    const matchesFilter = filterType === 'All' || entry.change === filterType;
    return matchesSearch && matchesFilter;
  });

  // Group history entries by date
  const groupedHistory = filteredHistory.reduce((groups, entry) => {
    const groupDate = formatGroupDate(entry.date);
    if (!groups[groupDate]) {
      groups[groupDate] = [];
    }
    groups[groupDate].push(entry);
    return groups;
  }, {});

  // Function to get icon based on change type
  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'Action Created':
        return <HistoryIcon color="primary" />;
      case 'Action Updated':
        return <EditIcon color="info" />;
      case 'Action Deleted':
        return <DeleteIcon color="error" />;
      default:
        return <HistoryIcon />;
    }
  };

  // Function to get color based on change type
  const getChangeColor = (changeType) => {
    switch (changeType) {
      case 'Action Created':
        return green[500];
      case 'Action Updated':
        return blue[500];
      case 'Action Deleted':
        return orange[500];
      default:
        return blue[500];
    }
  };

  // Apply filters to actions list
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesDeliverable = filterDeliverable ? action.deliverable === filterDeliverable : true;
      const matchesStatus = filterStatus ? action.status === filterStatus : true;
      const matchesOwner = filterOwner ? action.owner === filterOwner : true;
      return matchesDeliverable && matchesStatus && matchesOwner;
    });
  }, [actions, filterDeliverable, filterStatus, filterOwner]);

  // Get unique values for filters
  const uniqueDeliverables = useMemo(() => {
    const delivs = actions.map(action => action.deliverable);
    return [...new Set(delivs)];
  }, [actions]);

  const uniqueStatuses = useMemo(() => {
    const stats = actions.map(action => action.status);
    return [...new Set(stats)];
  }, [actions]);

  const uniqueOwners = useMemo(() => {
    const owners = actions.map(action => action.owner);
    return [...new Set(owners)];
  }, [actions]);

  return (
    <>
      <Header title="Action Tracker" />

      <Box sx={{ padding: 2 }} id="action-tracker-content">
        {actionTrackerData ? (
          <Paper elevation={3} sx={{ padding: 3, marginBottom: 4, position: 'relative' }}>
            <Typography variant="h5" color="primary" gutterBottom>
              Action Tracker Information
            </Typography>
            <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/manage-bid-dashboard')}
              >
                Back to Manage Bid
              </Button>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body1"><strong>Client:</strong> {clientName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body1"><strong>Opportunity:</strong> {opportunityName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body1"><strong>Total Actions:</strong> {actionTrackerData.totalActions || 0}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body1"><strong>Open Actions:</strong> {actionTrackerData.openActions || 0}</Typography>
                <Typography variant="body1"><strong>Closed Actions:</strong> {actionTrackerData.closedActions || 0}</Typography>
              </Grid>
            </Grid>
          </Paper>
        ) : (
          <Typography variant="h6" color="error">
            No action tracker data available.
          </Typography>
        )}

        {actionTrackerData && (
          <>
            {/* Charts Section */}
            <Grid container spacing={3} sx={{ marginBottom: 4 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">
                      Actions by Status
                    </Typography>
                    <div style={{ height: '300px' }}>
                      <Pie data={actionsByStatusData} options={chartOptions} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">
                      Actions by Deliverable
                    </Typography>
                    <div style={{ height: '300px' }}>
                      <Bar data={actionsByDeliverableData} options={{ ...chartOptions, indexAxis: 'y' }} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">
                      Actions by Owner
                    </Typography>
                    <div style={{ height: '300px' }}>
                      <Bar data={actionsByOwnerData} options={{ ...chartOptions, indexAxis: 'y' }} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Actions List Section */}
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Actions List
                    </Typography>

                    {/* Filters */}
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="filter-deliverable-label">Filter by Deliverable</InputLabel>
                        <Select
                          labelId="filter-deliverable-label"
                          value={filterDeliverable}
                          label="Filter by Deliverable"
                          onChange={(e) => setFilterDeliverable(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>All</em>
                          </MenuItem>
                          {uniqueDeliverables.map(deliv => (
                            <MenuItem key={deliv} value={deliv}>
                              {deliv}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="filter-status-label">Filter by Status</InputLabel>
                        <Select
                          labelId="filter-status-label"
                          value={filterStatus}
                          label="Filter by Status"
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>All</em>
                          </MenuItem>
                          {['Pending', 'In Progress', 'Completed'].map(status => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="filter-owner-label">Filter by Owner</InputLabel>
                        <Select
                          labelId="filter-owner-label"
                          value={filterOwner}
                          label="Filter by Owner"
                          onChange={(e) => setFilterOwner(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>All</em>
                          </MenuItem>
                          {uniqueOwners.map(owner => (
                            <MenuItem key={owner} value={owner}>
                              {owner}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Actions Table */}
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Action ID</TableCell>
                          <TableCell>Action Name</TableCell>
                          <TableCell>Deliverable</TableCell>
                          <TableCell>Owner</TableCell>
                          <TableCell>End Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Remarks</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredActions.length > 0 ? (
                          filteredActions.map(action => {
                            const isEditing = editing[action.actionId];
                            const actionData = isEditing ? editing[action.actionId] : action;

                            return (
                              <TableRow key={action.actionId}>
                                <TableCell>{actionData.actionId}</TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      value={actionData.name}
                                      onChange={e =>
                                        setEditing(prev => ({
                                          ...prev,
                                          [action.actionId]: { ...actionData, name: e.target.value },
                                        }))
                                      }
                                    />
                                  ) : (
                                    actionData.name
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      select
                                      value={actionData.deliverable}
                                      onChange={e =>
                                        setEditing(prev => ({
                                          ...prev,
                                          [action.actionId]: { ...actionData, deliverable: e.target.value },
                                        }))
                                      }
                                    >
                                      {(actionTrackerData.deliverables || []).map(deliv => (
                                        <MenuItem key={deliv} value={deliv}>
                                          {deliv}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  ) : (
                                    actionData.deliverable
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      value={actionData.owner}
                                      onChange={e =>
                                        setEditing(prev => ({
                                          ...prev,
                                          [action.actionId]: { ...actionData, owner: e.target.value },
                                        }))
                                      }
                                    />
                                  ) : (
                                    actionData.owner
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      type="date"
                                      value={actionData.endDate.substring(0, 10)} // Assuming ISO format
                                      onChange={e =>
                                        setEditing(prev => ({
                                          ...prev,
                                          [action.actionId]: { ...actionData, endDate: e.target.value },
                                        }))
                                      }
                                      InputLabelProps={{ shrink: true }}
                                    />
                                  ) : (
                                    formatDate(actionData.endDate)
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      select
                                      value={actionData.status}
                                      onChange={e =>
                                        setEditing(prev => ({
                                          ...prev,
                                          [action.actionId]: { ...actionData, status: e.target.value },
                                        }))
                                      }
                                    >
                                      {['Pending', 'In Progress', 'Completed'].map(status => (
                                        <MenuItem key={status} value={status}>
                                          {status}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  ) : (
                                    actionData.status
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <TextField
                                      value={actionData.remarks}
                                      onChange={e =>
                                        setEditing(prev => ({
                                          ...prev,
                                          [action.actionId]: { ...actionData, remarks: e.target.value },
                                        }))
                                      }
                                    />
                                  ) : (
                                    actionData.remarks
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  {isEditing ? (
                                    <>
                                      <Tooltip title="Save">
                                        <IconButton
                                          color="primary"
                                          onClick={() => handleSaveEditedAction(action.actionId, actionData)}
                                        >
                                          <SaveIcon />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
                                        <IconButton
                                          color="secondary"
                                          onClick={() => handleOpenDeleteDialog(action.actionId)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <>
                                      <Tooltip title="Edit">
                                        <IconButton
                                          color="primary"
                                          onClick={() => handleEditAction(action)}
                                        >
                                          <EditIcon />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Delete">
                                        <IconButton
                                          color="secondary"
                                          onClick={() => handleOpenDeleteDialog(action.actionId)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="View History">
                                        <IconButton
                                          color="info"
                                          onClick={() => handleOpenHistoryDialog(action.actionId)}
                                        >
                                          <HistoryIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={8} align="center">
                              No actions available. Please add a new action.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Add New Action Section */}
            <Box sx={{ marginTop: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Add New Action
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        label="Action Name *"
                        name="name"
                        value={actionForm.name}
                        onChange={handleActionFormChange}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        select
                        label="Deliverable *"
                        name="deliverable"
                        value={actionForm.deliverable}
                        onChange={handleActionFormChange}
                        fullWidth
                        required
                      >
                        {(actionTrackerData.deliverables || []).map(deliv => (
                          <MenuItem key={deliv} value={deliv}>
                            {deliv}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        label="Owner *"
                        name="owner"
                        value={actionForm.owner}
                        onChange={handleActionFormChange}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        label="End Date *"
                        name="endDate"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={actionForm.endDate}
                        onChange={handleActionFormChange}
                        fullWidth
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        select
                        label="Status *"
                        name="status"
                        value={actionForm.status}
                        onChange={handleActionFormChange}
                        fullWidth
                        required
                      >
                        {['Pending', 'In Progress', 'Completed'].map(status => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label="Remarks"
                        name="remarks"
                        value={actionForm.remarks}
                        onChange={handleActionFormChange}
                        fullWidth
                        multiline
                        rows={3}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleAddAction}
                        startIcon={<SaveIcon />}
                        disabled={addingAction}
                      >
                        {addingAction ? 'Adding...' : 'Add Action'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4, padding: 2 }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/')}>
          Home
        </Button>
        <Button variant="contained" color="secondary" onClick={exportToPDF}>
          Export to PDF
        </Button>
        {/* Removed the green "Manage Bid Dashboard" button as per your comment */}
      </Box>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialogFunc}
        aria-labelledby="delete-action-dialog-title"
        aria-describedby="delete-action-dialog-description"
      >
        <DialogTitle id="delete-action-dialog-title">Delete Action</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this action? This action cannot be recovered once deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialogFunc} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDeleteAction} color="secondary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action History Dialog */}
      <Dialog
        open={openHistoryDialog}
        onClose={handleCloseHistoryDialog}
        aria-labelledby="action-history-dialog-title"
        fullWidth
        maxWidth="md"
      >
        <DialogTitle id="action-history-dialog-title">Action History</DialogTitle>
        <DialogContent dividers>
          {/* Search and Filter Section */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Search Changes"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1, minWidth: '200px' }}
            />
            <TextField
              select
              label="Filter by Change Type"
              variant="outlined"
              size="small"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              sx={{ width: '200px' }}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Action Created">Action Created</MenuItem>
              <MenuItem value="Action Updated">Action Updated</MenuItem>
              <MenuItem value="Action Deleted">Action Deleted</MenuItem>
            </TextField>
          </Box>

          {/* Action History Timeline */}
          {filteredHistory.length > 0 ? (
            Object.keys(groupedHistory).map((date, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {date}
                </Typography>
                <Timeline position="alternate">
                  {groupedHistory[date].map((entry, idx) => (
                    <TimelineItem key={idx}>
                      <TimelineOppositeContent color="textSecondary">
                        {formatTime(entry.date)}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <Tooltip title={`Changed by: ${entry.changedBy}`} arrow>
                          <Avatar sx={{ bgcolor: getChangeColor(entry.change) }}>
                            {entry.changedBy.charAt(0).toUpperCase()}
                          </Avatar>
                        </Tooltip>
                        {idx < groupedHistory[date].length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Box
                          sx={{
                            border: `1px solid ${getChangeColor(entry.change)}`,
                            borderRadius: '8px',
                            padding: '8px',
                            backgroundColor: '#f9f9f9',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {getChangeIcon(entry.change)}
                            <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'bold' }}>
                              {entry.change}
                            </Typography>
                          </Box>
                          {entry.changedFields && entry.changedFields.length > 0 ? (
                            entry.changedFields.map((cf, i) => {
                              const fieldNames = {
                                deliverable: 'Deliverable',
                                owner: 'Owner',
                                endDate: 'End Date',
                                status: 'Status',
                                remarks: 'Remarks',
                              };
                              const fieldName = fieldNames[cf.field] || cf.field;
                              return (
                                <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                                  <strong>{fieldName}</strong>: "{cf.oldValue}" &rarr; "{cf.newValue}"
                                </Typography>
                              );
                            })
                          ) : (
                            <Typography variant="body2">No detailed changes recorded.</Typography>
                          )}
                        </Box>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </Box>
            ))
          ) : (
            <Typography variant="body1">No history available for this action.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActionTrackerPage;