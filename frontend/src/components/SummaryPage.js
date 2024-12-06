import React, { useRef } from 'react';
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
import { saveBidData } from '../services/apiService';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Helper function to calculate owner contributions
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

// Helper function to prepare milestones
const calculateMilestones = (activities) => {
  return Object.entries(activities || {}).map(([deliverable, activityList]) => {
    const startDate = activityList.reduce(
      (min, activity) => (new Date(activity.start_date) < new Date(min) ? activity.start_date : min),
      activityList[0]?.start_date
    );
    const endDate = activityList.reduce(
      (max, activity) => (new Date(activity.end_date) > new Date(max) ? activity.end_date : max),
      activityList[0]?.end_date
    );
    return { deliverable, startDate, endDate };
  });
};

const SummaryPage = () => {
  const { bidData } = useBidContext();
  const summaryRef = useRef();
  const navigate = useNavigate();
  const [homeDialog, setHomeDialog] = React.useState(false);

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
    try {
      // If `bidId` is not set or is "current_bid", construct a new bidId
      if (!bidData.bidId || bidData.bidId === 'current_bid') {
        const clientName = bidData.clientName?.replace(/\s+/g, '_') || 'UnknownClient';
        const opportunityName = bidData.opportunityName?.replace(/\s+/g, '_') || 'UnknownOpportunity';
        bidData.bidId = `${clientName}_${opportunityName}_Version 1`;
      }
  
      // Fetch the data from current_bid.json
      let existingData = {};
      try {
        const response = await getBidData('current_bid'); // Assuming `getBidData` fetches data by bidId
        if (response) {
          existingData = response;
        }
      } catch (error) {
        console.warn('Could not fetch current_bid data. Proceeding with new data.');
      }
  
      // Merge existing data with the current bid data
      const mergedBidData = { ...existingData, ...bidData };
  
      // Save the merged data with the updated bidId
      await saveBidData(mergedBidData);
  
      alert(`Bid finalized and saved as: ${mergedBidData.bidId}`);
      navigate('/'); // Navigate to home
    } catch (error) {
      console.error('Error finalizing bid:', error);
      alert('Failed to finalize the bid. Please try again.');
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

        {/* Charts */}
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
          sx={{ marginRight: 2 }}
        >
          Home
        </Button>
        <Button variant="contained" color="primary" onClick={finalizeBid} sx={{ marginRight: 2 }}>
          Finalize Bid
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