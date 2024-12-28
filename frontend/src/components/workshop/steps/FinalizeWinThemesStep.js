// src/components/workshop/steps/FinalizeWinThemesStep.js

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Grid,
  Snackbar,
  Alert,
  LinearProgress,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  GetApp as GetAppIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon, // Icon for exporting image
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useBidContext } from '../../../context/BidContext';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import panzoom from 'cytoscape-panzoom';
import qtip from 'cytoscape-qtip';
import 'qtip2/dist/jquery.qtip.min.css';
import $ from 'jquery';
import DetailModal from './DetailModal';
import Legend from './Legend';
import * as XLSX from 'xlsx'; // Removed jsPDF import since export to PDF is removed

// Register Cytoscape extensions
cytoscape.use(dagre);
cytoscape.use(panzoom);
cytoscape.use(qtip);

/**
 * Helper function to get icon names based on type
 * Using emojis for simplicity; replace with images or icons as needed
 */
const getIcon = (type) => {
  switch (type) {
    case 'Business Value':
      return '💼';
    case 'Feasibility':
      return '🔧';
    case 'Differentiation':
      return '🌟';
    case 'Threats':
      return '⚠️';
    case 'Opportunities':
      return '🚀';
    case 'Strengths':
      return '💪';
    case 'Weaknesses':
      return '🧱';
    case 'Pain':
      return '😣';
    case 'Gain':
      return '🎯';
    case 'EvaluationCriteria':
      return '📊';
    case 'ClientObjective':
      return '🎯'; // Icon for Client Objectives
    case 'Central':
      return '🏆';
    case 'WinTheme':
      return '🏅';
    default:
      return '📌';
  }
};

/**
 * Helper function to capitalize the first letter
 * @param {String} string
 * @returns {String}
 */
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Function to calculate coverage based on coverageScore
 * @param {Number} coverageScore - Coverage score from SWOT linkages
 * @returns {String} - Coverage percentage as a string
 */
const calculateCoverage = (coverageScore) => {
  if (typeof coverageScore !== 'number') return 'N/A';
  return `${coverageScore}%`;
};

/**
 * Function to generate star icons based on the number of stars
 * @param {Number} stars - Number of stars to display
 * @returns {String} - HTML string with star icons
 */
const generateStars = (stars) => {
  if (typeof stars !== 'number') return 'N/A';
  const filledStar = '★';
  const emptyStar = '☆';
  let starString = '';
  for (let i = 1; i <= 5; i++) {
    starString += i <= stars ? filledStar : emptyStar;
  }
  return starString;
};

/**
 * FinalizeWinThemesStep Component
 *
 * This component visualizes finalized win themes using Cytoscape.js with a React-based minimap,
 * allowing users to review, export to Excel or image, and navigate through the workshop steps.
 */
const FinalizeWinThemesStep = () => {
  const { bidId } = useParams();
  const navigate = useNavigate();
  const { bidData, setBidData } = useBidContext();

  // References and States
  const cyRef = useRef(null);
  const miniCyRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract and Map Data
  const winThemes = bidData?.workshop?.finalizedWinThemes || [];
  const pains = bidData?.workshop?.finalizedPains || [];
  const gains = bidData?.workshop?.finalizedGains || [];
  const evaluationCriteria = bidData?.workshop?.clientContext?.evaluationCriteria || [];
  const objectives = bidData?.workshop?.clientContext?.objectives || []; // Added objectives
  const swot = bidData?.workshop?.swot || {};

  // Memoize lookup maps to optimize performance
  const painMap = useMemo(() => {
    const map = {};
    pains.forEach((pain) => {
      map[pain.id] = pain.text;
    });
    return map;
  }, [pains]);

  const gainMap = useMemo(() => {
    const map = {};
    gains.forEach((gain) => {
      map[gain.id] = gain.text;
    });
    return map;
  }, [gains]);

  const evalCriteriaMap = useMemo(() => {
    const map = {};
    evaluationCriteria.forEach((criteria) => {
      map[criteria.id] = criteria.text;
    });
    return map;
  }, [evaluationCriteria]);

  const objectivesMap = useMemo(() => {
    const map = {};
    objectives.forEach((objective) => {
      map[objective.id] = objective.text;
    });
    return map;
  }, [objectives]);

  const swotMap = useMemo(() => {
    const map = {};
    Object.keys(swot).forEach((category) => {
      swot[category].forEach((item) => {
        map[item.id] = { text: item.text, category };
      });
    });
    return map;
  }, [swot]);

  /**
   * Function to transform winThemes data to Cytoscape elements
   * @param {Array} themes - Array of win themes
   * @returns {Array} - Array of Cytoscape elements (nodes and edges)
   */
  const transformWinThemesToCytoscape = useCallback(
    (themes) => {
      const elements = [];

      // Central Node
      elements.push({
        data: { id: 'central', label: `${getIcon('Central')} Win Themes`, type: 'Central' },
        classes: 'central',
      });

      // Iterate through each theme to create nodes and edges
      themes.forEach((theme) => {
        const themeId = theme.id;
        const themeCoverage = calculateCoverage(theme.scores?.avgCoverage || 0); // Use scores.avgCoverage

        // Theme Node
        elements.push({
          data: {
            id: themeId,
            label: `${getIcon('WinTheme')} ${theme.title || `Theme ${themeId}`}`,
            type: 'WinTheme',
            coverage: themeCoverage,
            description: theme.rationale || 'No description provided.', // Use 'rationale'
            scores: theme.scores || {}, // Include scores for tooltip
          },
          classes: 'winTheme',
        });

        // Edge from Central to Theme
        elements.push({
          data: { source: 'central', target: themeId },
          classes: 'themeEdge',
        });

        // Pains Nodes and Links
        if (theme.linkages?.pains) {
          theme.linkages.pains.forEach((pain, pIndex) => {
            const painId = `${themeId}-pain-${pIndex + 1}`;
            const painLabel = painMap[pain.painId] || 'Unknown Pain';
            const painStars = pain.rating || 0; // Use 'rating' for stars
            const painStarsDisplay = generateStars(painStars);

            elements.push({
              data: {
                id: painId,
                label: `${getIcon('Pain')} ${painLabel}`,
                type: 'Pain',
                stars: painStarsDisplay, // Store stars for tooltip
              },
              classes: 'pain',
            });

            // Edge from Theme to Pain
            elements.push({
              data: { source: themeId, target: painId },
              classes: 'painEdge',
            });
          });
        }

        // Gains Nodes and Links
        if (theme.linkages?.gains) {
          theme.linkages.gains.forEach((gain, gIndex) => {
            const gainId = `${themeId}-gain-${gIndex + 1}`;
            const gainLabel = gainMap[gain.gainId] || 'Unknown Gain';
            const gainStars = gain.rating || 0; // Use 'rating' for stars
            const gainStarsDisplay = generateStars(gainStars);

            elements.push({
              data: {
                id: gainId,
                label: `${getIcon('Gain')} ${gainLabel}`,
                type: 'Gain',
                stars: gainStarsDisplay, // Store stars for tooltip
              },
              classes: 'gain',
            });

            // Edge from Theme to Gain
            elements.push({
              data: { source: themeId, target: gainId },
              classes: 'gainEdge',
            });
          });
        }

        // Evaluation Criteria Nodes and Links
        if (theme.linkages?.evaluationCriteria) {
          theme.linkages.evaluationCriteria.forEach((criteria, cIndex) => {
            const criteriaId = `${themeId}-criteria-${cIndex + 1}`;
            const criteriaLabel = evalCriteriaMap[criteria.criterionId] || 'Unknown Criteria';
            const criteriaStars = criteria.rating || 0; // Use 'rating' for stars
            const criteriaStarsDisplay = generateStars(criteriaStars);

            elements.push({
              data: {
                id: criteriaId,
                label: `${getIcon('EvaluationCriteria')} ${criteriaLabel}`,
                type: 'EvaluationCriteria',
                stars: criteriaStarsDisplay, // Store stars for tooltip
              },
              classes: 'evaluationCriteria',
            });

            // Edge from Theme to Evaluation Criteria
            elements.push({
              data: { source: themeId, target: criteriaId },
              classes: 'criteriaEdge',
            });
          });
        }

        // Client Objectives Nodes and Links
        if (theme.linkages?.clientContext) {
          theme.linkages.clientContext.forEach((objective, oIndex) => {
            const objectiveId = `${themeId}-objective-${oIndex + 1}`;
            const objectiveLabel = objectivesMap[objective.contextId] || 'Unknown Objective';
            const objectiveStars = objective.rating || 0; // Use 'rating' for stars
            const objectiveStarsDisplay = generateStars(objectiveStars);

            elements.push({
              data: {
                id: objectiveId,
                label: `${getIcon('ClientObjective')} ${objectiveLabel}`,
                type: 'ClientObjective',
                stars: objectiveStarsDisplay, // Store stars for tooltip
              },
              classes: 'clientObjective',
            });

            // Edge from Theme to Client Objective
            elements.push({
              data: { source: themeId, target: objectiveId },
              classes: 'objectiveEdge',
            });
          });
        }

        // SWOT Linkages
        const swotCategories = ['strengths', 'weaknesses', 'opportunities', 'threats'];
        swotCategories.forEach((swotCat) => {
          const swotItems = theme.swotLinkages?.[swotCat] || [];
          swotItems.forEach((item, sIndex) => {
            const swotItem = swotMap[item.id];
            const swotItemLabel = swotItem
              ? `${getIcon(capitalizeFirstLetter(swotCat))} ${swotItem.text}`
              : 'Unknown SWOT Item';
            const swotItemId = `${themeId}-swot-${swotCat}-${sIndex + 1}`;
            const swotCoverage = calculateCoverage(item.coverageScore || 0);

            elements.push({
              data: {
                id: swotItemId,
                label: `${swotItemLabel} (Coverage: ${swotCoverage})`,
                type: capitalizeFirstLetter(swotCat),
                coverage: swotCoverage, // Store coverage for tooltip
              },
              classes: swotCat,
            });

            // Edge from Theme to SWOT Item
            elements.push({
              data: { source: themeId, target: swotItemId },
              classes: `${swotCat}Edge`,
            });
          });
        });
      });

      return elements;
    },
    [painMap, gainMap, evalCriteriaMap, objectivesMap, swotMap]
  );

  /**
   * Function to initialize tooltips using qTip
   */
  const initializeTooltips = useCallback(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.nodes().forEach((node) => {
        let tooltipContent = '';

        switch (node.data('type')) {
          case 'WinTheme':
            tooltipContent = `
              <strong>Description:</strong> ${node.data('description')}<br/>
              <strong>Average Pains & Gains:</strong> ${node.data('scores').avgPainsGains || 'N/A'}<br/>
              <strong>Average Context Criteria:</strong> ${node.data('scores').avgContextCriteria || 'N/A'}<br/>
              <strong>Average Coverage:</strong> ${node.data('scores').avgCoverage || 'N/A'}<br/>
              <strong>Final Composite Score:</strong> ${node.data('scores').finalCompositeScore || 'N/A'}
            `;
            break;
          case 'Pain':
          case 'Gain':
          case 'EvaluationCriteria':
          case 'ClientObjective':
            tooltipContent = `Stars: ${node.data('stars')}`;
            break;
          case 'Strengths':
          case 'Weaknesses':
          case 'Opportunities':
          case 'Threats':
            tooltipContent = `Coverage: ${node.data('coverage')}`;
            break;
          case 'Central':
            tooltipContent = 'Central Node';
            break;
          default:
            tooltipContent = 'No additional information.';
        }

        // Initialize qTip
        node.qtip({
          content: tooltipContent,
          show: {
            event: 'mouseover',
          },
          hide: {
            event: 'mouseout',
          },
          style: {
            classes: 'qtip-bootstrap',
          },
          position: {
            my: 'top center',
            at: 'bottom center',
          },
        });
      });
    }
  }, []);

  /**
   * Function to synchronize main Cytoscape instance with the minimap
   */
  const synchronizePanAndZoom = useCallback(() => {
    if (cyRef.current && miniCyRef.current) {
      // Listen to pan and zoom events on main cy
      cyRef.current.on('pan zoom', () => {
        const pan = cyRef.current.pan();
        const zoom = cyRef.current.zoom();
        miniCyRef.current.pan(pan);
        miniCyRef.current.zoom(zoom / 4); // Scale down zoom for minimap
      });

      // Listen to pan and zoom events on minimap cy
      miniCyRef.current.on('pan zoom', () => {
        const pan = miniCyRef.current.pan();
        const zoom = miniCyRef.current.zoom();
        cyRef.current.pan(pan);
        cyRef.current.zoom(zoom * 4); // Scale up zoom for main graph
      });
    }
  }, []);

  // Initialize Cytoscape Elements
  useEffect(() => {
    if (!winThemes || winThemes.length === 0) {
      console.warn('No finalized win themes found to visualize.');
      setElements([]);
      return;
    }

    const cyElements = transformWinThemesToCytoscape(winThemes);
    setElements(cyElements);
  }, [winThemes, transformWinThemesToCytoscape]);

  // Initialize tooltips whenever elements change
  useEffect(() => {
    initializeTooltips();
  }, [elements, initializeTooltips]);

  // Synchronize Pan and Zoom between main graph and minimap
  useEffect(() => {
    synchronizePanAndZoom();
  }, [synchronizePanAndZoom]);

  // Handle Search Functionality
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.nodes().forEach((node) => {
        const label = node.data('label').toLowerCase();
        if (label.includes(searchTerm.toLowerCase())) {
          node.style('display', 'element');
        } else {
          node.style('display', 'none');
        }
      });
    }

    if (miniCyRef.current) {
      miniCyRef.current.nodes().forEach((node) => {
        const label = node.data('label').toLowerCase();
        if (label.includes(searchTerm.toLowerCase())) {
          node.style('display', 'element');
        } else {
          node.style('display', 'none');
        }
      });
    }
  }, [searchTerm]);

  /**
   * Export to Excel Function
   */
  const exportToExcel = () => {
    if (winThemes.length === 0) {
      setSnackbar({ open: true, message: 'No win themes to export.', severity: 'warning' });
      return;
    }

    try {
      // Prepare Themes Data
      const themesData = winThemes.map((theme, index) => ({
        'Theme ID': index + 1,
        Title: theme.title || `Theme ${index + 1}`,
        Description: theme.rationale || 'No description provided.',
        'Business Value': theme.businessValue || 0,
        Feasibility: theme.feasibility || 0,
        Differentiation: theme.differentiation || 0,
        'Priority Score': theme.priorityScore || 0,
        'Average Coverage': theme.scores?.avgCoverage || 'N/A',
      }));

      // Prepare Pains Data
      const painsData = winThemes.flatMap((theme, themeIndex) =>
        theme.linkages?.pains?.map((pain) => ({
          'Theme ID': themeIndex + 1,
          Pain: painMap[pain.painId] || 'Unknown Pain',
          Stars: generateStars(pain.rating || 0), // Display stars based on rating
        })) || []
      );

      // Prepare Gains Data
      const gainsData = winThemes.flatMap((theme, themeIndex) =>
        theme.linkages?.gains?.map((gain) => ({
          'Theme ID': themeIndex + 1,
          Gain: gainMap[gain.gainId] || 'Unknown Gain',
          Stars: generateStars(gain.rating || 0), // Display stars based on rating
        })) || []
      );

      // Prepare Evaluation Criteria Data
      const evalData = winThemes.flatMap((theme, themeIndex) =>
        theme.linkages?.evaluationCriteria?.map((criteria) => ({
          'Theme ID': themeIndex + 1,
          'Evaluation Criteria': evalCriteriaMap[criteria.criterionId] || 'Unknown Criteria',
          Stars: generateStars(criteria.rating || 0), // Display stars based on rating
        })) || []
      );

      // Prepare Client Objectives Data
      const objectivesData = winThemes.flatMap((theme, themeIndex) =>
        theme.linkages?.clientContext?.map((objective) => ({
          'Theme ID': themeIndex + 1,
          'Client Objective': objectivesMap[objective.contextId] || 'Unknown Objective',
          Stars: generateStars(objective.rating || 0), // Display stars based on rating
        })) || []
      );

      // Prepare SWOT Linkages Data
      const swotData = winThemes.flatMap((theme, themeIndex) => {
        const swotCategories = ['strengths', 'weaknesses', 'opportunities', 'threats'];
        return swotCategories.flatMap((category) => {
          const items = theme.swotLinkages?.[category] || [];
          return items.map((item) => ({
            'Theme ID': themeIndex + 1,
            Category: capitalizeFirstLetter(category),
            Item: swotMap[item.id]?.text || 'Unknown SWOT Item',
            'Coverage Score': calculateCoverage(item.coverageScore || 0), // Coverage remains for SWOT
          }));
        });
      });

      // Create Worksheets
      const themesSheet = XLSX.utils.json_to_sheet(themesData);
      const painsSheet = XLSX.utils.json_to_sheet(painsData);
      const gainsSheet = XLSX.utils.json_to_sheet(gainsData);
      const evalSheet = XLSX.utils.json_to_sheet(evalData);
      const objectivesSheet = XLSX.utils.json_to_sheet(objectivesData); // New sheet for Client Objectives
      const swotSheet = XLSX.utils.json_to_sheet(swotData);

      // Create Workbook and Append Sheets
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, themesSheet, 'Themes');
      XLSX.utils.book_append_sheet(workbook, painsSheet, 'Pains');
      XLSX.utils.book_append_sheet(workbook, gainsSheet, 'Gains');
      XLSX.utils.book_append_sheet(workbook, evalSheet, 'Evaluation Criteria');
      XLSX.utils.book_append_sheet(workbook, objectivesSheet, 'Client Objectives'); // Append Client Objectives
      XLSX.utils.book_append_sheet(workbook, swotSheet, 'SWOT Linkages');

      // Generate Excel file and trigger download
      XLSX.writeFile(workbook, 'WinThemes_Detailed.xlsx');
      setSnackbar({ open: true, message: 'Exported to Excel successfully!', severity: 'success' });
    } catch (error) {
      console.error('Excel Export Error:', error);
      setSnackbar({ open: true, message: 'Failed to export to Excel.', severity: 'error' });
    }
  };

  /**
   * Export Graph Image Function
   * Exports the main graph as a PNG image using cy.png()
   */
  const exportGraphImage = () => {
    const cy = cyRef.current;
    if (!cy) {
      setSnackbar({ open: true, message: 'Graph not initialized.', severity: 'error' });
      return;
    }

    try {
      const pngData = cy.png({ output: 'blob', scale: 2, full: true });

      if (!pngData) {
        throw new Error('Failed to generate PNG data.');
      }

      // Create a blob URL and trigger download
      const url = URL.createObjectURL(pngData);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'WinThemesGraph.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success Snackbar
      setSnackbar({ open: true, message: 'Graph exported as image successfully!', severity: 'success' });
    } catch (error) {
      console.error('Image Export Error:', error);
      setSnackbar({ open: true, message: 'Failed to export graph as image.', severity: 'error' });
    }
  };

  // Handle Snackbar Close
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Navigation Handlers
  const handlePrevious = () => {
    navigate(`/win-theme-workshop/${bidId}/prioritization`);
  };

  const handleFinish = () => {
    // Finalize the win themes in the context
    setBidData((prevData) => ({
      ...prevData,
      workshop: {
        ...prevData.workshop,
        winThemes: prevData.workshop.winThemes.map((theme) =>
          theme.selectedForPrioritization ? { ...theme, selectedForPrioritization: true } : theme
        ),
      },
    }));

    setSnackbar({
      open: true,
      message: 'Workshop completed! Your win themes have been finalized.',
      severity: 'success',
    });
    navigate('/'); // Navigate to the home page
  };

  // Cytoscape Styles
  const cyStyle = [
    {
      selector: 'core',
      style: {
        'background-color': '#f5f5f5', // Light gray background
      },
    },
    {
      selector: 'node',
      style: {
        label: 'data(label)', // Display the concatenated icon and label
        'text-valign': 'center',
        'text-halign': 'center',
        color: '#fff',
        'text-outline-width': 2,
        'text-outline-color': '#0074D9',
        width: 'mapData(coverage, 0, 100, 80, 150)', // Dynamic width based on coverage
        height: 'mapData(coverage, 0, 100, 80, 150)', // Dynamic height based on coverage
        padding: '10px',
        shape: 'roundrectangle', // Default shape
        'font-size': '14px', // Adjusted font size for better readability
        'font-family': 'Arial, Helvetica, sans-serif',
        'text-wrap': 'wrap', // Enable text wrapping
        'text-max-width': 120, // Maximum width before wrapping
        'background-clip': 'none',
        'background-opacity': 1,
        'transition-property': 'background-color, width, height',
        'transition-duration': '0.5s',
      },
    },
    // Specific node styles for different types
    {
      selector: 'node.central',
      style: {
        'background-color': '#FF4136',
        shape: 'hexagon',
        'font-size': '16px',
        'text-outline-color': '#FF4136',
      },
    },
    {
      selector: 'node.winTheme',
      style: {
        'background-color': '#2ECC40',
        shape: 'roundrectangle',
        'font-size': '14px',
        'text-outline-color': '#2ECC40',
      },
    },
    {
      selector: 'node.pain',
      style: {
        'background-color': '#FF851B',
        shape: 'triangle',
        'font-size': '12px',
        'text-outline-color': '#FF851B',
      },
    },
    {
      selector: 'node.gain',
      style: {
        'background-color': '#B10DC9',
        shape: 'diamond',
        'font-size': '12px',
        'text-outline-color': '#B10DC9',
      },
    },
    {
      selector: 'node.evaluationCriteria',
      style: {
        'background-color': '#0074D9',
        shape: 'rectangle',
        'font-size': '12px',
        'text-outline-color': '#0074D9',
      },
    },
    {
      selector: 'node.clientObjective', // New node type for Client Objectives
      style: {
        'background-color': '#FFDC00',
        shape: 'ellipse',
        'font-size': '12px',
        'text-outline-color': '#FFDC00',
      },
    },
    {
      selector: 'node.strengths',
      style: {
        'background-color': '#39CCCC',
        shape: 'ellipse',
        'font-size': '12px',
        'text-outline-color': '#39CCCC',
      },
    },
    {
      selector: 'node.weaknesses',
      style: {
        'background-color': '#FF4136',
        shape: 'ellipse',
        'font-size': '12px',
        'text-outline-color': '#FF4136',
      },
    },
    {
      selector: 'node.opportunities',
      style: {
        'background-color': '#3D9970',
        shape: 'ellipse',
        'font-size': '12px',
        'text-outline-color': '#3D9970',
      },
    },
    {
      selector: 'node.threats',
      style: {
        'background-color': '#85144b',
        shape: 'ellipse',
        'font-size': '12px',
        'text-outline-color': '#85144b',
      },
    },
    // Edge styles
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'edge.themeEdge',
      style: {
        'line-color': '#0074D9',
        'target-arrow-color': '#0074D9',
      },
    },
    {
      selector: 'edge.painEdge',
      style: {
        'line-color': '#FF851B',
        'target-arrow-color': '#FF851B',
      },
    },
    {
      selector: 'edge.gainEdge',
      style: {
        'line-color': '#B10DC9',
        'target-arrow-color': '#B10DC9',
      },
    },
    {
      selector: 'edge.criteriaEdge',
      style: {
        'line-color': '#39CCCC',
        'target-arrow-color': '#39CCCC',
      },
    },
    {
      selector: 'edge.objectiveEdge', // New edge class for Client Objectives
      style: {
        'line-color': '#FFDC00',
        'target-arrow-color': '#FFDC00',
      },
    },
    {
      selector: 'edge.strengthsEdge',
      style: {
        'line-color': '#39CCCC',
        'target-arrow-color': '#39CCCC',
      },
    },
    {
      selector: 'edge.weaknessesEdge',
      style: {
        'line-color': '#FF4136',
        'target-arrow-color': '#FF4136',
      },
    },
    {
      selector: 'edge.opportunitiesEdge',
      style: {
        'line-color': '#3D9970',
        'target-arrow-color': '#3D9970',
      },
    },
    {
      selector: 'edge.threatsEdge',
      style: {
        'line-color': '#85144b',
        'target-arrow-color': '#85144b',
      },
    },
  ];

  // Cytoscape Layout Configuration
  const cyLayout = {
    name: 'dagre',
    rankDir: 'LR', // Layout direction: 'TB', 'BT', 'LR', 'RL'
    nodeSep: 50, // Separation between nodes
    edgeSep: 10, // Separation between edges
    rankSep: 100, // Separation between ranks
    animate: true, // Enable animation during layout
    animationDuration: 500, // Animation duration in ms
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/*
        1) Header with styling matching BrainstormWinThemesStep.js
      */}
      <Typography
        variant="h5"
        color="primary"
        sx={{
          fontWeight: 'bold',
          textAlign: 'center',
          mt: 2,
          p: 2,
          backgroundColor: '#e3f2fd',
          borderRadius: 2,
        }}
      >
        Finalize Your Win Themes
      </Typography>
      {/* Fixed Text Visibility */}
      <Typography
        variant="body1"
        color="textSecondary"
        sx={{ textAlign: 'center', mb: 4 }}
      >
        Review your finalized win themes below. Visualize them in an interactive network graph and export the data for your records.
      </Typography>

      {/*
        2) Step Indicator and Progress Bar with positioning similar to BrainstormWinThemesStep.js
      */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Step 6 of 6
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Typography>
              1. Client Context <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              2. Pains & Gains <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              3. SWOT Analysis <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              4. Brainstorm Win Themes <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography>
              5. Prioritization <CheckCircleIcon color="success" fontSize="small" />
            </Typography>
          </Grid>
          <Grid item>
            <Typography sx={{ fontWeight: 'bold' }}>6. Finalize</Typography>
          </Grid>
        </Grid>
        <Box sx={{ mx: 4, mt: 1 }}>
          <LinearProgress variant="determinate" value={100} />
        </Box>
      </Box>

      {/*
        3) Search Bar (optional, can align or style similar to buttons)
      */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <TextField
          label="Search Nodes"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: '300px' }}
        />
      </Box>

      {/*
        4) Network Visualization and Minimap
      */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* Main Graph */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2,
            height: '800px',
            width: { xs: '100%', md: '80%' },
            position: 'relative',
            backgroundColor: '#f5f5f5',
            overflow: 'hidden',
          }}
        >
          {elements.length > 0 ? (
            <CytoscapeComponent
              elements={CytoscapeComponent.normalizeElements(elements)}
              style={{ width: '100%', height: '100%' }}
              stylesheet={cyStyle}
              layout={cyLayout}
              cy={(cy) => {
                cyRef.current = cy;
                console.log('Cytoscape Instance:', cy); // Log to verify methods

                // Initialize Panzoom
                cy.panzoom({
                  zoomFactor: 0.1,
                  zoomSpeed: 0.1,
                  fitSelector: 'node',
                  panSpeed: 0.2,
                });

                // Handle node clicks for detailed view
                cy.on('tap', 'node', (event) => {
                  const node = event.target;
                  setSelectedNode(node.data());
                  setModalOpen(true);
                });

                // Initialize tooltips after layout completion
                cy.layout(cyLayout).run().promiseOn('layoutstop').then(() => {
                  initializeTooltips();
                });
              }}
              zoom={1}
              pan={{ x: 0, y: 0 }}
            />
          ) : (
            <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
              No finalized win themes available to visualize.
            </Typography>
          )}
        </Paper>

        {/* Minimap */}
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            borderRadius: 2,
            height: '200px',
            width: { xs: '100%', md: '20%' },
            backgroundColor: '#f5f5f5',
            position: 'relative',
          }}
        >
          {elements.length > 0 && (
            <CytoscapeComponent
              elements={CytoscapeComponent.normalizeElements(elements)}
              style={{ width: '100%', height: '100%' }}
              stylesheet={[
                ...cyStyle,
                {
                  selector: 'node',
                  style: {
                    label: '', // Hide labels in minimap
                    'background-opacity': 0.6, // Slight transparency
                  },
                },
                {
                  selector: 'edge',
                  style: {
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    opacity: 0.5, // Slight transparency
                  },
                },
              ]}
              layout={{ name: 'preset' }} // Use preset layout since positions are already defined
              cy={(cy) => {
                miniCyRef.current = cy;
                // Disable interactions on minimap
                cy.autounselectify(true);
                cy.userPanningEnabled(false);
                cy.userZoomingEnabled(false);
                cy.panzoom({
                  // Optionally, you can disable panzoom on minimap
                });

                // Adjust minimap view based on main graph
                if (cyRef.current) {
                  const mainCy = cyRef.current;
                  const viewport = mainCy.viewport();

                  cy.fit();
                  cy.pan(viewport.pan);
                  cy.zoom(viewport.zoom / 4); // Scale down zoom for minimap
                }
              }}
            />
          )}
        </Paper>
      </Box>

      {/* Legend */}
      <Legend />

      {/*
        5) Export Buttons styled similarly to Add Win Theme button
      */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
        {/* Removed Export to PDF Button */}
        <Button
          variant="contained"
          startIcon={<GetAppIcon />}
          onClick={exportToExcel}
          color="secondary"
          aria-label="Export Win Themes Data to Excel"
        >
          Export to Excel
        </Button>
        {/* Button to Export Graph as Image */}
        <Button
          variant="contained"
          startIcon={<PhotoCameraIcon />}
          onClick={exportGraphImage}
          color="info"
          aria-label="Export Graph as Image"
        >
          Export Graph Image
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/*
        6) Navigation Buttons styled similarly to BrainstormWinThemesStep.js
      */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handlePrevious}
          aria-label="Go to Previous Step"
        >
          Previous
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={handleFinish}
          color="success" // Changed color to indicate completion
          aria-label="Finalize and Finish Workshop"
        >
          Finish
        </Button>
      </Box>

      {/* Snackbar for export feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Detail Modal */}
      <DetailModal
        open={modalOpen}
        handleClose={() => setModalOpen(false)}
        nodeData={selectedNode}
      />
    </Box>
  );
};

export default FinalizeWinThemesStep;