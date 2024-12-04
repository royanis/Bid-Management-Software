import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00539b', // Virtusa blue
    },
    secondary: {
      main: '#008dc9', // Light blue
    },
    text: {
      primary: '#333333', // Dark text for better visibility
      secondary: '#ffffff', // White text for cards or dark backgrounds
    },
    background: {
      default: '#f4f6f8', // Light background for the app
      paper: '#ffffff', // Background for Paper components
    },
    error: {
      main: '#d32f2f', // Standard error red for error messages and alerts
    },
    success: {
      main: '#388e3c', // Standard success green for confirmations
    },
    warning: {
      main: '#fbc02d', // Warning yellow for alerts
    },
    info: {
      main: '#0288d1', // Info blue for notifications
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    h1: {
      fontSize: '2.4rem',
      fontWeight: 700,
      color: '#00539b', // Align header color with primary palette
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#00539b', // Align secondary headers
    },
    h4: {
      fontSize: '1.6rem',
      fontWeight: 600,
      color: '#333333', // General heading color for better contrast
    },
    body1: {
      fontSize: '1rem',
      color: '#333333', // Default body text
    },
    body2: {
      fontSize: '0.875rem', // Slightly smaller body text for secondary information
      color: '#666666',
    },
    button: {
      fontWeight: 700, // Bold text for buttons
      textTransform: 'none', // Disable automatic uppercase
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Prevent automatic uppercase for buttons
          fontWeight: 'bold',
          borderRadius: '4px', // Consistent rounded corners
          padding: '8px 16px', // Standard padding for buttons
        },
        containedPrimary: {
          color: '#ffffff', // White text for primary buttons
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '16px', // Add consistent spacing below text fields
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '8px', // Consistent rounded corners
          padding: '16px', // Standard padding for Paper components
          boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)', // Light shadow for depth
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        gutterBottom: {
          marginBottom: '1rem', // Add consistent spacing below typography components
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 16px', // Consistent padding for table cells
          borderBottom: '1px solid #e0e0e0', // Light border for separation
        },
        head: {
          fontWeight: 600, // Bold text for table headers
          backgroundColor: '#f4f6f8', // Light background for table headers
        },
      },
    },
  },
});

export default theme;