// src/App.js

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { WorkshopProvider } from './context/WorkshopContext';
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
import ActionTrackerPage from './components/ActionTrackerPage'; // Import ActionTrackerPage
import Chatbot from './components/Chatbot'; // Import Chatbot
import 'bootstrap/dist/css/bootstrap.min.css';
import AppLayout from './components/layout/AppLayout'; // Import AppLayout

// Import individual workshop step components
import ClientContextStep from './components/workshop/steps/ClientContextStep';
import PainGainStep from './components/workshop/steps/PainGainStep';
import SwotStep from './components/workshop/steps/SwotStep';
import BrainstormWinThemesStep from './components/workshop/steps/BrainstormWinThemesStep';
import PrioritizationStep from './components/workshop/steps/PrioritizationStep';
import FinalizeWinThemesStep from './components/workshop/steps/FinalizeWinThemesStep';
import WinThemeWorkshopWizard from './components/workshop/WinThemeWorkshopWizard';

const App = () => {
  return (
    <BidProvider> {/* Wrap the app in BidProvider */}
      <WorkshopProvider> {/* Wrap with WorkshopProvider */}
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

                {/* Summary Page */}
                <Route path="/summary" element={<SummaryPage />} />

                {/* Manage Bid Dashboard */}
                <Route path="/manage-bid" element={<ManageBidDashboardPage />} />

                {/* Action Tracker Page */}
                <Route path="/action-tracker" element={<ActionTrackerPage />} />

                {/* Workshop Routes */}
                <Route path="/win-theme-workshop/:bidId/*" element={<WorkshopRoutes />} />

                {/* Fallback for Undefined Routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* Chatbot Component */}
              <Chatbot />
            </Router>
          </Box>
        </ThemeProvider>
      </WorkshopProvider>
    </BidProvider>
  );
};

// Component to handle nested workshop steps with AppLayout
const WorkshopRoutes = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="client-context" element={<ClientContextStep />} />
        <Route path="pain-gain" element={<PainGainStep />} />
        <Route path="swot" element={<SwotStep />} />
        <Route path="win-themes" element={<BrainstormWinThemesStep />} />
        <Route path="prioritization" element={<PrioritizationStep />} />
        <Route path="finalize" element={<FinalizeWinThemesStep />} />
        {/* Add other workshop step routes here */}
        {/* Fallback within workshop */}
        <Route path="*" element={<Navigate to="client-context" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;