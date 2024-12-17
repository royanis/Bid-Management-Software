// src/components/SummaryPage.jsx

import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useBidContext } from '../context/BidContext';
import Header from './Header';
import Footer from './Footer';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  saveBidData,
  getBidData,
  listFiles,
  moveToArchive,
  createActionTracker,
  getActionTrackerData,
} from '../services/apiService';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const calculateOwnerContributions = (activities) => {
  const contributions = {};
  Object.values(activities || {}).forEach((activityList) => {
    activityList.forEach((activity) => {
      if (activity.owner) {
        contributions[activity.owner] = (contributions[activity.owner] || 0) + 1;
      }
    });
  });
  return Object.entries(contributions).map(([name, count]) => ({ name, count }));
};

const calculateMilestones = (activities) => {
  return Object.entries(activities || {}).map(([deliverable, activityList]) => {
    const startDate = activityList.reduce(
      (min, activity) => (new Date(activity.startDate) < new Date(min) ? activity.startDate : min),
      activityList[0]?.startDate
    );
    const endDate = activityList.reduce(
      (max, activity) => (new Date(activity.endDate) > new Date(max) ? activity.endDate : max),
      activityList[0]?.endDate
    );
    return { deliverable, startDate, endDate };
  });
};

const SummaryPage = () => {
  const { bidData, showSnackbar } = useBidContext();
  const summaryRef = useRef();
  const navigate = useNavigate();
  const [homeDialog, setHomeDialog] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const deliverableActivities = bidData.deliverables?.map((deliverable) => ({
    name: deliverable,
    value: bidData.activities?.[deliverable]?.length || 0,
  })) || [];

  const ownerContributions = calculateOwnerContributions(bidData.activities);
  const milestones = calculateMilestones(bidData.activities);

  const COLORS = ['#00529B', '#82ca9d', '#ffc658', '#ff8042', '#a4de6c', '#d0ed57'];

  const exportToPDF = () => {
    const input = summaryRef.current;
    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;
      let y = 10;

      pdf.setFontSize(16);
      pdf.setTextColor('#00529B');
      pdf.text('Virtusa Bid Management System', 10, y);
      y += 10;

      pdf.addImage(imgData, 'PNG', 10, y, imgWidth, imgHeight);

      const generationDate = new Date().toLocaleString();
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${generationDate}`, 10, pageHeight - 10);
      pdf.text('Virtusa - Empowering Innovation', 140, pageHeight - 10);

      pdf.save(`BidPlan_Summary_${bidData.bidId || 'current_bid'}.pdf`);
    });
  };

  const finalizeBid = async () => {
    setFinalizing(true);
    try {
      // Construct final bidId if not done yet
      if (!bidData.bidId || bidData.bidId === 'current_bid') {
        const clientName = bidData.clientName?.trim() || 'Unknown Client';
        const opportunityName = bidData.opportunityName?.trim() || 'Unknown Opportunity';
        // We'll just name the first version as Version1. The backend will handle subsequent versions if needed.
        bidData.bidId = `${clientName}_${opportunityName}_Version1`;
      }

      // Merge with any existing current_bid data
      let existingData = {};
      try {
        const response = await getBidData('current_bid');
        if (response) {
          existingData = response;
        }
      } catch (error) {
        console.warn('Could not fetch current_bid data. Proceeding with new data.');
      }

      const mergedBidData = { ...existingData, ...bidData };
      await saveBidData(mergedBidData);

      // Attempt to get action tracker data
      try {
        const atData = await getActionTrackerData(mergedBidData.bidId);
        if (!atData) {
          // no action tracker found, create a new one
          await createActionTracker(mergedBidData.bidId);
          showSnackbar('Action Tracker created successfully.', 'success');
        } else {
          // Action tracker exists. Fetch old contents first
          const oldATData = await getActionTrackerData(mergedBidData.bidId);
        
          // Create a new version and ensure old contents are preserved.
          // Adjust createActionTracker (and possibly backend) to accept oldATData
          await createActionTracker(mergedBidData.bidId, oldATData);
          showSnackbar('New version of Action Tracker created successfully with old contents.', 'success');
        }
      } catch (atError) {
        // If 404 or error, try creating a new action tracker
        await createActionTracker(mergedBidData.bidId);
        showSnackbar('Action Tracker created successfully.', 'success');
      }

      alert(`Bid finalized and saved as: ${mergedBidData.bidId}`);
      navigate('/');
    } catch (error) {
      console.error('Error finalizing bid:', error);
      alert('Failed to finalize the bid. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const milestonesView = milestones.map(({ deliverable, startDate, endDate }) => ({
    deliverable,
    startDate: new Date(startDate).toLocaleDateString(),
    endDate: new Date(endDate).toLocaleDateString(),
  }));

  return (
    <>
      <Header title="Bid Plan Summary" />

      <Box ref={summaryRef} sx={{ padding: 4 }}>
        <Paper elevation={3} sx={{ padding: 3, marginBottom: 4 }}>
          <Typography variant="h5" color="primary" gutterBottom>
            Bid Plan Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>Client Name:</strong> {bidData.clientName}
              </Typography>
              <Typography variant="body1">
                <strong>Opportunity Name:</strong> {bidData.opportunityName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>RFP Issue Date:</strong> {new Date(bidData.timeline?.rfpIssueDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body1">
                <strong>Proposal Submission Date:</strong> {new Date(bidData.timeline?.proposalSubmissionDate).toLocaleDateString()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={4} sx={{ marginBottom: 4 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="primary" gutterBottom>
              Activities by Deliverables
            </Typography>
            <Paper sx={{ padding: 2, height: '300px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={deliverableActivities}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    fill="#00529B"
                    label
                  >
                    {deliverableActivities.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="primary" gutterBottom>
              Owner Contributions
            </Typography>
            <Paper sx={{ padding: 2, height: '300px' }}>
              <ResponsiveContainer>
                <BarChart data={ownerContributions} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={3} sx={{ padding: 3 }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Milestone View
          </Typography>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Deliverable</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>Start Date</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left', padding: '8px' }}>End Date</th>
              </tr>
            </thead>
            <tbody>
              {milestonesView.map(({ deliverable, startDate, endDate }, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{deliverable}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{startDate}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{endDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Paper>
      </Box>

      <Box sx={{ textAlign: 'right', marginTop: 4, padding: 4 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setHomeDialog(true)}
          sx={{ mr: 2 }}
        >
          Home
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={finalizeBid}
          sx={{ mr: 2 }}
          disabled={finalizing}
        >
          {finalizing ? 'Finalizing...' : 'Finalize Bid'}
        </Button>
        <Button variant="contained" color="primary" onClick={exportToPDF}>
          Export to PDF
        </Button>
      </Box>

      <Dialog
        open={homeDialog}
        onClose={() => setHomeDialog(false)}
      >
        <DialogTitle>Navigate Home</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to return to the homepage? Any unsaved changes will be lost unless the bid is finalized.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')} color="primary">
            Confirm
          </Button>
          <Button onClick={() => setHomeDialog(false)} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Footer />
    </>
  );
};

export default SummaryPage;