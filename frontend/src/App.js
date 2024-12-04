import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import CreateBidPlan from './components/CreateBidPlan';
import FlyingFormation from './components/FlyingFormation';
import { BidProvider } from './context/BidContext'; // Import context provider
import theme from './theme/theme';
import DeliverableActivityPage from './components/DeliverableActivityPage';
import SummaryPage from './components/SummaryPage';
import ManageBidDashboardPage from './components/ManageBidDashboardPage';
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {
  return (
    <BidProvider> {/* Wrap the app in BidProvider */}
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" flexDirection="column" minHeight="100vh">
          <Router>
            <Routes>
              {/* Home Page */}
              <Route path="/" element={<HomePage />} />

              {/* Create Bid Plan */}
              <Route path="/create-bid" element={<CreateBidPlan />} />

              {/* Flying Formation */}
              <Route path="/flying-formation" element={<FlyingFormation />} />

              {/* Deliverable Activities */}
              <Route path="/deliverable-activities" element={<DeliverableActivityPage />} />

              {/* Summary Page*/}
              <Route path="/summary" element={<SummaryPage />} />

              {/* Manage Bid Landing Page*/}
              <Route path="/manage-bid" element={<ManageBidDashboardPage />} />

              {/* Fallback for Undefined Routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </Box>
      </ThemeProvider>
    </BidProvider>
  );
};

export default App;