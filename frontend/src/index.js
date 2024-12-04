import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Global styles
import App from './App'; // Main application component
import { BidProvider } from './context/BidContext'; // Provide app-wide state through context
import { ThemeProvider } from '@mui/material/styles'; // Material-UI theme provider
import CssBaseline from '@mui/material/CssBaseline'; // Reset and normalize CSS
import theme from './theme/theme'; // Custom Material-UI theme
import reportWebVitals from './reportWebVitals'; // Optional performance monitoring

const root = ReactDOM.createRoot(document.getElementById('root'));

// Wrap the app with all necessary providers
root.render(
  <React.StrictMode>
    {/* Material-UI theme provider */}
    <ThemeProvider theme={theme}>
      {/* CSS Reset and Global Styling */}
      <CssBaseline />
      {/* App-wide state using BidContext */}
      <BidProvider>
        <App />
      </BidProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Optional: Log performance metrics
reportWebVitals(console.log); // Replace with any analytics endpoint if needed