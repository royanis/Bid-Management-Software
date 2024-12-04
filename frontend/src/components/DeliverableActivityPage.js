import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useBidContext } from '../context/BidContext';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';
import Header from './Header';
import Footer from './Footer';
import { saveBidData, getBidData } from '../services/apiService';

// Helper function to format dates to match Gantt's config
const formatDateToGantt = (date) => {
  const parsedDate = new Date(date);
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0'); // Month is 0-based
  const year = parsedDate.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper function to parse Gantt-compatible format back to ISO format
const parseDateFromGantt = (ganttDate) => {
  const [day, month, year] = ganttDate.split('-');
  return new Date(`${year}-${month}-${day}`).toISOString().split('T')[0];
};

const DeliverableActivityPage = () => {
  const navigate = useNavigate();
  const { bidData, setBidData } = useBidContext();

  const deliverables = bidData.deliverables || [];
  const [currentDeliverableIndex, setCurrentDeliverableIndex] = useState(0);
  const currentDeliverable = deliverables[currentDeliverableIndex];
  const ganttContainer = useRef(null);

  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    owner: '',
    startDate: '',
    endDate: '',
    status: '',
    remarks: '',
  });

  const teamMembers = [
    ...bidData.team.core.map((member) => member.name),
    ...bidData.team.solution.map((member) => member.name),
  ].filter((name) => name);

  useEffect(() => {
    if (ganttContainer.current) {
      initializeGantt();
    }
  }, []);

  useEffect(() => {
    const fetchActivitiesForDeliverable = async () => {
      try {
        const savedBidData = await getBidData(bidData.bidId || 'current_bid');
        if (
          savedBidData &&
          savedBidData.activities &&
          savedBidData.activities[currentDeliverable]
        ) {
          const savedActivities = savedBidData.activities[currentDeliverable].map((activity) => ({
            ...activity,
            start_date: formatDateToGantt(activity.start_date),
            end_date: formatDateToGantt(activity.end_date),
          }));
          setActivities(savedActivities);
          updateGanttData(savedActivities);
        } else {
          setActivities([]);
          updateGanttData([]);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    };

    fetchActivitiesForDeliverable();
  }, [currentDeliverable]);

  const initializeGantt = () => {
    gantt.init(ganttContainer.current);

    gantt.config.date_format = '%d-%m-%Y';
    gantt.config.scales = [{ unit: 'day', step: 1, format: '%d %M' }];

    gantt.templates.tooltip_text = (start, end, task) => `
      <b>Activity:</b> ${task.text}<br>
      <b>Owner:</b> ${task.owner}<br>
      <b>Status:</b> ${task.status || 'N/A'}<br>
      <b>Remarks:</b> ${task.remarks || 'N/A'}<br>
      <b>Start:</b> ${task.start_date}<br>
      <b>End:</b> ${task.end_date}
    `;

    gantt.config.columns = [
      { name: 'text', label: 'Activity', tree: true, width: 200 },
      { name: 'owner', label: 'Owner', align: 'center', width: 150 },
      { name: 'status', label: 'Status', align: 'center', width: 150 },
    ];

    gantt.config.start_date = new Date(bidData.timeline.rfpIssueDate);
    gantt.config.end_date = new Date(bidData.timeline.proposalSubmissionDate);

    gantt.config.row_height = 30;
    gantt.config.grid_width = 600;
  };

  const updateGanttData = (data = activities) => {
    const ganttData = data.map((activity) => ({
      id: activity.id,
      text: activity.name,
      owner: activity.owner,
      status: activity.status,
      start_date: activity.start_date,
      end_date: activity.end_date,
      remarks: activity.remarks,
    }));

    gantt.clearAll();
    gantt.parse({ data: ganttData });
    gantt.render();
  };

  const addActivity = () => {
    if (
      !newActivity.name ||
      !newActivity.owner ||
      !newActivity.startDate ||
      !newActivity.endDate
    ) {
      alert('Please complete all fields before adding an activity.');
      return;
    }

    const startDate = formatDateToGantt(newActivity.startDate);
    const endDate = formatDateToGantt(newActivity.endDate);

    const newTask = {
      id: activities.length + 1,
      ...newActivity,
      start_date: startDate,
      end_date: endDate,
    };

    const updatedActivities = [...activities, newTask];
    setActivities(updatedActivities);
    updateGanttData(updatedActivities);

    setNewActivity({ name: '', owner: '', startDate: '', endDate: '', status: '', remarks: '' });
  };

  const saveActivities = async () => {
    const updatedBidData = {
      ...bidData,
      activities: {
        ...bidData.activities,
        [currentDeliverable]: activities.map((activity) => ({
          ...activity,
          start_date: parseDateFromGantt(activity.start_date),
          end_date: parseDateFromGantt(activity.end_date),
        })),
      },
    };
    setBidData(updatedBidData);
    await saveBidData(updatedBidData);
    alert('Activities saved successfully.');
  };

  const navigateToNext = () => {
    if (currentDeliverableIndex < deliverables.length - 1) {
      setCurrentDeliverableIndex((prev) => prev + 1);
    } else {
      navigate('/summary');
    }
  };

  const navigateToPrevious = () => {
    if (currentDeliverableIndex > 0) {
      setCurrentDeliverableIndex((prev) => prev - 1);
    } else {
      navigate('/flying-formation');
    }
  };

  return (
    <>
      <Header title="Bid Management System - Deliverable Activities" />

      <Box sx={{ flex: 1, padding: 4 }}>
        <Typography variant="h4" color="primary" gutterBottom>
          Define Activities for Deliverable: {currentDeliverable}
        </Typography>
        <Typography variant="body1" color="textSecondary" gutterBottom>
          Assign activities, owners, and timelines for this deliverable.
        </Typography>

        <Box
          ref={ganttContainer}
          sx={{
            height: '500px',
            marginTop: 4,
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9',
          }}
        ></Box>

        <Typography variant="h6" gutterBottom>
          Add Activities
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              id="activity-name"
              label="Activity Name"
              value={newActivity.name}
              onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="owner-select-label">Owner</InputLabel>
              <Select
                id="owner-select"
                labelId="owner-select-label"
                value={newActivity.owner}
                onChange={(e) => setNewActivity({ ...newActivity, owner: e.target.value })}
              >
                {teamMembers.map((member, index) => (
                  <MenuItem key={index} value={member}>
                    {member}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              id="start-date"
              label="Start Date"
              type="date"
              value={newActivity.startDate}
              onChange={(e) => setNewActivity({ ...newActivity, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              id="end-date"
              label="End Date"
              type="date"
              value={newActivity.endDate}
              onChange={(e) => setNewActivity({ ...newActivity, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="status-select-label">Status</InputLabel>
              <Select
                id="status-select"
                labelId="status-select-label"
                value={newActivity.status}
                onChange={(e) => setNewActivity({ ...newActivity, status: e.target.value })}
              >
                {['Open', 'In Progress', 'Completed'].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              id="remarks"
              label="Remarks"
              value={newActivity.remarks}
              onChange={(e) => setNewActivity({ ...newActivity, remarks: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" onClick={addActivity} sx={{ marginRight: 2 }}>
              Add Activity
            </Button>
            <Button variant="outlined" color="secondary" onClick={saveActivities}>
              Save Activities
            </Button>
          </Grid>
        </Grid>

        <Box sx={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={navigateToPrevious}>
            Previous
          </Button>
          <Button variant="contained" color="primary" onClick={navigateToNext}>
            {currentDeliverableIndex < deliverables.length - 1 ? 'Next Deliverable' : 'Proceed to Summary'}
          </Button>
        </Box>
      </Box>

      <Footer />
    </>
  );
};

export default DeliverableActivityPage;