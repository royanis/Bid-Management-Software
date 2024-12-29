// src/components/Chatbot.js

import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, Button, Avatar, Chip, Snackbar, Alert } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MinimizeIcon from '@mui/icons-material/Minimize';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import CircularProgress from '@mui/material/CircularProgress'; // For loading indicator
import { finalizeBid } from '../services/apiService'; // Ensure this function returns response.data
import '../styles/Chatbot.css';

const DEFAULT_ROLES = [
  'Deal Lead', 
  'Deal Shaper', 
  'Deal Coach', 
  'Deal Capture', 
  'Deal Negotiator', 
  'Developer', 
  'Designer', 
  'Project Manager', 
  'Quality Assurance'
];

const DEFAULT_DELIVERABLES = [
  'Solution PPT', 
  'Rate Card', 
  'Commercial Proposal', 
  'Resource Profiles', 
  'Executive Summary', 
  'Supplier Profile Questions'
];

const SUGGESTED_ACTIVITIES = {
  'Solution PPT': ['Draft PPT', 'Design Slides', 'Review Slides', 'Finalize PPT'],
  'Rate Card': ['Gather Rates', 'Prepare Rate Sheet', 'Validate with Finance', 'Approval'],
  'Commercial Proposal': ['Draft Proposal', 'Review with Legal', 'Approve Pricing', 'Submit to Client'],
  'Executive Summary': ['Draft Executive Summary', 'Edit/Refine', 'Review by Leadership', 'Finalize Document'],
  'Supplier Profile Questions': ['Gather Supplier Info', 'Draft Responses', 'Review Responses', 'Finalize Q&A'],
  'Resource Profiles': ['Identify Key Resources', 'Collect CVs', 'Review Credentials', 'Finalize Resource Matrix']
};

const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed'];

const Chatbot = () => {
  const [open, setOpen] = useState(true); // Chatbox visible on load
  const [maximized, setMaximized] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! Ready to create a new bid or manage your current bids?', suggestions: [] },
  ]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState(null);
  const [bidDetails, setBidDetails] = useState({
    clientName: '',
    opportunityName: '',
    timeline: { rfpIssueDate: '', qaSubmissionDate: '', proposalSubmissionDate: '' },
    deliverables: [],
    activities: {}, 
    team: []
  });
  const [loading, setLoading] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // State variables to manage progression
  const [currentDeliverableIndex, setCurrentDeliverableIndex] = useState(0);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // States for multi-select and single-select modes
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [singleSelectMode, setSingleSelectMode] = useState(false);
  const [multiSelectOptions, setMultiSelectOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [allowCustomAddition, setAllowCustomAddition] = useState(false);
  const [customItem, setCustomItem] = useState('');

  // Snackbar State for Feedback
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const toggleChat = () => setOpen((prev) => !prev);

  const addMessage = (sender, text, suggestions = []) => {
    setMessages((prev) => [...prev, { sender, text, suggestions }]);
  };

  // Helper functions for date validation
  const isValidDate = (date) => !isNaN(new Date(date).getTime());
  const isAfterDate = (date1, date2) => new Date(date1) > new Date(date2);
  const isBetweenDates = (date, start, end) => {
    const d = new Date(date);
    return d >= new Date(start) && d <= new Date(end);
  };

  // Function to format activities for summary
  const formatActivities = (activities) =>
    Object.entries(activities)
      .map(([deliverable, tasks]) =>
        `- **${deliverable}:** ${tasks.map((t) => {
          let details = t.name;
          if (t.owner !== 'Unassigned') details += ` (Owner: ${t.owner})`;
          if (t.startDate && t.endDate) details += ` [${t.startDate} to ${t.endDate}]`;
          if (t.status) details += ` {${t.status}}`;
          if (t.remarks) details += ` "${t.remarks}"`;
          return details;
        }).join(', ')}`
      )
      .join('\n');

  // Function to handle bid finalization
  const handleFinalizeBid = async () => {
    setLoading(true);
    try {
      const response = await finalizeBid(bidDetails);
      console.log('Finalize Bid Response:', response); // Debugging line
      
      // Assuming response.message contains a success message
      // We'll append the options for the user
      const confirmationMessage = `${response.message}\n\nType "create new bid" to start a new bid or "exit" to end the session.`;
      
      return { text: confirmationMessage };
    } catch (error) {
      console.error('Error finalizing bid:', error);
      return { text: 'An error occurred while finalizing the bid. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Function to send user messages
  const handleSendMessage = async (message) => {
    if (sessionEnded) {
      addMessage('bot', 'The session has ended. Please start a new session if you wish to continue.');
      return;
    }
    if (!message.trim()) return;
    addMessage('user', message);
    setInput('');
    setLoading(true);

    try {
      const response = await processUserInput(message.trim());
      addMessage('bot', response.text, response.suggestions || []);

      if (response.multiSelect) {
        setMultiSelectMode(true);
        setSingleSelectMode(false);
        setMultiSelectOptions(response.multiSelectOptions || []);
        setSelectedOptions([]);
        setAllowCustomAddition(response.allowCustom === true);
        setCustomItem('');
      } else if (response.singleSelect) {
        setSingleSelectMode(true);
        setMultiSelectMode(false);
        setMultiSelectOptions(response.singleSelectOptions || []);
        setSelectedOptions([]);
        setAllowCustomAddition(false);
        setCustomItem('');
      } else {
        setMultiSelectMode(false);
        setSingleSelectMode(false);
        setMultiSelectOptions([]);
        setSelectedOptions([]);
        setAllowCustomAddition(false);
        setCustomItem('');
      }

      if (response.endSession) {
        setSessionEnded(true);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      addMessage('bot', 'Sorry, something went wrong. Please try again.');
      setMultiSelectMode(false);
      setSingleSelectMode(false);
      setMultiSelectOptions([]);
      setSelectedOptions([]);
      setAllowCustomAddition(false);
      setCustomItem('');
    } finally {
      setLoading(false);
    }
  };

  // Main function to process user inputs based on context
  const processUserInput = async (input) => {
    const lowerInput = input.toLowerCase();

    if (sessionEnded) {
      if (lowerInput.includes('start') && lowerInput.includes('new session')) {
        return { text: 'New session started. How can I help you today?' };
      }
      return { text: 'The session has ended. Please start a new session if you wish to continue.' };
    }

    if (lowerInput === 'all done done exit') {
      return { text: 'Session ended. Have a great day!', endSession: true };
    }

    if (!context) {
      if (
        lowerInput.includes('new bid') ||
        lowerInput.includes('create a bid') ||
        lowerInput.includes('start a bid') ||
        lowerInput.includes('add a bid') ||
        lowerInput.includes('lets create a new bid')
      ) {
        setContext('client_name');
        return { text: 'Great! Let’s start with the client name. What is the client name?' };
      } else if (
        lowerInput.includes('manage') ||
        lowerInput.includes('manage a bid') ||
        lowerInput.includes('manage current bids')
      ) {
        return { text: 'Managing current bids is on our roadmap. For now, let’s focus on creating a new bid.' };
      } else {
        return { text: 'I’m not sure what you mean. Please say "start a new bid" or "manage current bids."' };
      }
    }

    switch (context) {
      case 'client_name':
        if (input.length < 3) {
          return { text: 'Client name is too short. Please provide a valid name.' };
        } else {
          setBidDetails((prev) => ({ ...prev, clientName: input }));
          setContext('opportunity_name');
          return { text: 'What is the opportunity name?' };
        }

      case 'opportunity_name':
        if (input.length < 3) {
          return { text: 'Opportunity name is too short. Please provide a valid name.' };
        }
        setBidDetails((prev) => ({ ...prev, opportunityName: input }));
        setContext('rfp_issue_date');
        return { text: 'What is the RFP Issue Date? (Format: YYYY-MM-DD)' };

      case 'rfp_issue_date':
        if (isValidDate(input)) {
          setBidDetails((prev) => ({
            ...prev,
            timeline: { ...prev.timeline, rfpIssueDate: input },
          }));
          setContext('qa_submission_date');
          return { text: 'What is the QA Submission Date? (Format: YYYY-MM-DD)' };
        } else {
          return { text: 'That doesn’t look like a valid date. Please try again.' };
        }

      case 'qa_submission_date':
        if (isValidDate(input)) {
          setBidDetails((prev) => ({
            ...prev,
            timeline: { ...prev.timeline, qaSubmissionDate: input },
          }));
          setContext('proposal_submission_date');
          return { text: 'What is the Proposal Submission Date? (Format: YYYY-MM-DD)' };
        } else {
          return { text: 'Invalid date. Please provide a valid QA Submission Date.' };
        }

      case 'proposal_submission_date':
        if (isValidDate(input) && isAfterDate(input, bidDetails.timeline.rfpIssueDate)) {
          setBidDetails((prev) => ({
            ...prev,
            timeline: { ...prev.timeline, proposalSubmissionDate: input },
          }));
          setContext('deliverables_selection');
          return {
            text: 'Please select your deliverables from the list below. You can select multiple and add your own.',
            multiSelect: true,
            multiSelectOptions: DEFAULT_DELIVERABLES,
            allowCustom: true
          };
        } else {
          return { text: 'Invalid Proposal Submission Date. Ensure it is after the RFP Issue Date.' };
        }

      case 'deliverables_selection':
        {
          const chosenDeliverables = input.split(',').map((d) => d.trim()).filter(Boolean);
          if (chosenDeliverables.length === 0) {
            return { text: 'Please provide at least one deliverable.' };
          } else {
            // Initialize activities based on chosen deliverables
            const activities = {};
            chosenDeliverables.forEach((d) => {
              activities[d] = SUGGESTED_ACTIVITIES[d] ? SUGGESTED_ACTIVITIES[d].map((act) => ({
                name: act,
                owner: 'Unassigned',
                status: 'Open',
                startDate: '',
                endDate: '',
                remarks: ''
              })) : [];
            });
            setBidDetails((prev) => ({ ...prev, deliverables: chosenDeliverables, activities }));
            setContext('roles_selection');
            return { 
              text: `Deliverables set: ${chosenDeliverables.join(', ')}.\nPlease select the roles for your team from the list below or add new roles.`,
              multiSelect: true,
              multiSelectOptions: DEFAULT_ROLES,
              allowCustom: true
            };
          }
        }

      case 'roles_selection':
        {
          const chosenRoles = input.split(',').map((r) => r.trim()).filter(Boolean);
          if (chosenRoles.length === 0) {
            return { text: 'Please select at least one role.' };
          } else {
            // Remove duplicates and ensure roles are unique
            const uniqueRoles = Array.from(new Set(chosenRoles));
            setBidDetails((prev) => ({ 
              ...prev, 
              team: uniqueRoles.map((role) => ({ role, name: '' })) 
            }));
            setContext('assign_role_names');
            setCurrentRoleIndex(0);
            return { text: 'Great! Now, please provide the name for the first role.' };
          }
        }

      case 'assign_role_names':
        {
          if (currentRoleIndex >= bidDetails.team.length) {
            setContext('activities_selection');
            const summary = (
              `Here’s your bid summary:\n` +
              `**Client:** ${bidDetails.clientName}\n` +
              `**Opportunity:** ${bidDetails.opportunityName}\n` +
              `**Timeline:**\n- RFP Issue: ${bidDetails.timeline.rfpIssueDate}\n` +
              `- QA Submission: ${bidDetails.timeline.qaSubmissionDate}\n` +
              `- Proposal Submission: ${bidDetails.timeline.proposalSubmissionDate}\n` +
              `**Deliverables:** ${bidDetails.deliverables.join(', ')}\n` +
              `**Activities:**\n${formatActivities(bidDetails.activities)}\n` +
              `**Team:** ${bidDetails.team.map((member) => `${member.name} (${member.role})`).join(', ')}\n\n` +
              'Type "finalize" to save, "create new bid" to start a new bid, or "exit" to end the session.'
            );
            return { text: summary };
          }

          const currentRole = bidDetails.team[currentRoleIndex].role;
          const rolePrompt = `Please enter the name for the role: **${currentRole}**.`;

          // Assign the entered name to the current role
          setBidDetails((prev) => {
            const updatedTeam = [...prev.team];
            updatedTeam[currentRoleIndex].name = input;
            return { ...prev, team: updatedTeam };
          });

          // Move to the next role
          setCurrentRoleIndex(prev => prev + 1);
          const nextRoleIndex = currentRoleIndex + 1;

          if (nextRoleIndex < bidDetails.team.length) {
            const nextRole = bidDetails.team[nextRoleIndex].role;
            return { text: `Please enter the name for the role: **${nextRole}**.` };
          } else {
            // All roles assigned, proceed to activities selection
            setContext('activities_selection');
            setCurrentDeliverableIndex(0);
            setCurrentActivityIndex(0);
            return { text: 'All roles have been assigned. Now, please select activities for each deliverable.' };
          }
        }

      case 'activities_selection':
        {
          if (currentDeliverableIndex >= bidDetails.deliverables.length) {
            setContext('review');
            const summary = (
              `Here’s your bid summary:\n` +
              `**Client:** ${bidDetails.clientName}\n` +
              `**Opportunity:** ${bidDetails.opportunityName}\n` +
              `**Timeline:**\n- RFP Issue: ${bidDetails.timeline.rfpIssueDate}\n` +
              `- QA Submission: ${bidDetails.timeline.qaSubmissionDate}\n` +
              `- Proposal Submission: ${bidDetails.timeline.proposalSubmissionDate}\n` +
              `**Deliverables:** ${bidDetails.deliverables.join(', ')}\n` +
              `**Activities:**\n${formatActivities(bidDetails.activities)}\n` +
              `**Team:** ${bidDetails.team.map((member) => `${member.name} (${member.role})`).join(', ')}\n\n` +
              'Type "finalize" to save, "create new bid" to start a new bid, or "exit" to end the session.'
            );
            return { text: summary };
          }

          const currentDeliverable = bidDetails.deliverables[currentDeliverableIndex];
          const deliverableActivities = bidDetails.activities[currentDeliverable];

          // Transition to 'assign_activities' context
          setContext('assign_activities');
          return { 
            text: `For deliverable **${currentDeliverable}**, please select activities. You can select multiple or add new activities.`,
            multiSelect: true,
            multiSelectOptions: SUGGESTED_ACTIVITIES[currentDeliverable] || [],
            allowCustom: true
          };
        }

      case 'assign_activities':
        {
          const chosenActivities = input.split(',').map((a) => a.trim()).filter(Boolean);
          if (chosenActivities.length === 0) {
            return { text: 'Please provide at least one activity.' };
          } else {
            const deliverable = bidDetails.deliverables[currentDeliverableIndex];
            const existingActivities = bidDetails.activities[deliverable].map(act => act.name.toLowerCase());
            // Replace existing activities with the selected ones
            const updatedActivities = chosenActivities.map(act => ({
              name: act,
              owner: 'Unassigned',
              status: 'Open',
              startDate: '',
              endDate: '',
              remarks: ''
            }));

            setBidDetails((prev) => ({
              ...prev,
              activities: {
                ...prev.activities,
                [deliverable]: updatedActivities // Replacing activities instead of appending
              }
            }));

            // Reset activity index for assigning owners
            setCurrentActivityIndex(0);
            setContext('assign_activity_owner'); // Transition to owner assignment
            return { text: `Please assign owners to the activities for **${deliverable}**.` };
          }
        }

      case 'assign_activity_owner':
        {
          const deliverable = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[deliverable][currentActivityIndex];
          const teamMembers = bidDetails.team.map((m) => m.name);

          // Transition to 'assign_activity_owner_response' context
          setContext('assign_activity_owner_response');

          return {
            text: `Who should be the owner of '${activity.name}' under '${deliverable}'? Please select from the team members.`,
            singleSelect: true,
            singleSelectOptions: teamMembers
          };
        }

      case 'assign_activity_owner_response':
        {
          const chosenOwner = bidDetails.team.find((member) => member.name.toLowerCase() === input.toLowerCase());
          if (!chosenOwner) {
            return {
              text: `Please choose a valid owner from the team members.`,
              singleSelect: true,
              singleSelectOptions: bidDetails.team.map((m) => m.name)
            };
          }

          const deliverable = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[deliverable][currentActivityIndex];
          activity.owner = chosenOwner.name;
          setBidDetails({ ...bidDetails });

          setContext('assign_activity_start_date');
          return { text: `What is the start date for '${activity.name}'? (Format: YYYY-MM-DD)` };
        }

      case 'assign_activity_start_date':
        {
          const deliverable = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[deliverable][currentActivityIndex];
          if (!isValidDate(input)) {
            return { text: 'Invalid date format. Please enter start date in YYYY-MM-DD format.' };
          }
          const { rfpIssueDate, proposalSubmissionDate } = bidDetails.timeline;
          if (!isBetweenDates(input, rfpIssueDate, proposalSubmissionDate)) {
            return { text: `Start date must be between ${rfpIssueDate} and ${proposalSubmissionDate}. Please try again.` };
          }

          activity.startDate = input;
          setBidDetails({ ...bidDetails });

          setContext('assign_activity_end_date');
          return { text: `What is the end date for '${activity.name}'? (Format: YYYY-MM-DD)` };
        }

      case 'assign_activity_end_date':
        {
          const deliverable = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[deliverable][currentActivityIndex];
          if (!isValidDate(input)) {
            return { text: 'Invalid date format. Please enter end date in YYYY-MM-DD format.' };
          }
          const { proposalSubmissionDate } = bidDetails.timeline;
          if (!isBetweenDates(input, activity.startDate, proposalSubmissionDate)) {
            return { text: `End date must be between ${activity.startDate} and ${proposalSubmissionDate}. Please try again.` };
          }
          if (new Date(input) < new Date(activity.startDate)) {
            return { text: `End date cannot be before start date. Please try again.` };
          }

          activity.endDate = input;
          setBidDetails({ ...bidDetails });

          setContext('assign_activity_status');
          return {
            text: `What is the status for '${activity.name}'?`,
            singleSelect: true,
            singleSelectOptions: STATUS_OPTIONS
          };
        }

      case 'assign_activity_status':
        {
          const chosenStatus = STATUS_OPTIONS.find((s) => s.toLowerCase() === input.toLowerCase());
          if (!chosenStatus) {
            return {
              text: `Please choose a valid status.`,
              singleSelect: true,
              singleSelectOptions: STATUS_OPTIONS
            };
          }

          const deliverable = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[deliverable][currentActivityIndex];
          activity.status = chosenStatus;
          setBidDetails({ ...bidDetails });

          setContext('assign_activity_remarks');
          return { text: `Any remarks for '${activity.name}'? (Type 'none' if no remarks)` };
        }

      case 'assign_activity_remarks':
        {
          const deliverable = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[deliverable][currentActivityIndex];
          activity.remarks = (input.toLowerCase() === 'none') ? '' : input;
          setBidDetails({ ...bidDetails });

          // Move to next activity
          const nextActivityIndex = currentActivityIndex + 1;
          const totalActivities = bidDetails.activities[deliverable].length;

          if (nextActivityIndex < totalActivities) {
            setCurrentActivityIndex(nextActivityIndex);
            setContext('assign_activity_owner');
            const nextActivity = bidDetails.activities[deliverable][nextActivityIndex];
            return {
              text: `Who should be the owner of '${nextActivity.name}' under '${deliverable}'? Please select from the team members.`,
              singleSelect: true,
              singleSelectOptions: bidDetails.team.map((m) => m.name)
            };
          } else {
            // Move to next deliverable
            const nextDeliverableIndex = currentDeliverableIndex + 1;
            if (nextDeliverableIndex < bidDetails.deliverables.length) {
              setCurrentDeliverableIndex(nextDeliverableIndex);
              setCurrentActivityIndex(0);
              setContext('activities_selection');
              const nextDeliverable = bidDetails.deliverables[nextDeliverableIndex];
              return { 
                text: `For deliverable **${nextDeliverable}**, please select activities. You can select multiple or add new activities.`,
                multiSelect: true,
                multiSelectOptions: SUGGESTED_ACTIVITIES[nextDeliverable] || [],
                allowCustom: true
              };
            } else {
              // All activities for all deliverables are assigned, proceed to review
              setContext('review');
              const summary = (
                `Here’s your bid summary:\n` +
                `**Client:** ${bidDetails.clientName}\n` +
                `**Opportunity:** ${bidDetails.opportunityName}\n` +
                `**Timeline:**\n- RFP Issue: ${bidDetails.timeline.rfpIssueDate}\n` +
                `- QA Submission: ${bidDetails.timeline.qaSubmissionDate}\n` +
                `- Proposal Submission: ${bidDetails.timeline.proposalSubmissionDate}\n` +
                `**Deliverables:** ${bidDetails.deliverables.join(', ')}\n` +
                `**Activities:**\n${formatActivities(bidDetails.activities)}\n` +
                `**Team:** ${bidDetails.team.map((member) => `${member.name} (${member.role})`).join(', ')}\n\n` +
                'Type "finalize" to save, "create new bid" to start a new bid, or "exit" to end the session.'
              );
              return { text: summary };
            }
          }
        }

      case 'review':
        {
          const lowerInput = input.toLowerCase();
          if (lowerInput === 'finalize') {
            const finalizeResponse = await handleFinalizeBid();
            return finalizeResponse; // { text: 'Bid saved successfully...' } or error message
          } else if (lowerInput === 'create new bid') {
            // Reset bid details and context to start a new bid
            setBidDetails({
              clientName: '',
              opportunityName: '',
              timeline: { rfpIssueDate: '', qaSubmissionDate: '', proposalSubmissionDate: '' },
              deliverables: [],
              activities: {}, 
              team: []
            });
            setContext('client_name');
            setCurrentDeliverableIndex(0);
            setCurrentActivityIndex(0);
            setCurrentRoleIndex(0);
            return { text: 'Great! Let’s start with the client name. What is the client name?' };
          } else if (lowerInput === 'exit') {
            // End the session
            setSessionEnded(true);
            return { text: 'Session ended. Please refresh the page for the change to take effect. Have a great day!', endSession: true };
          } else {
            return { text: 'Please type "finalize" to save, "create new bid" to start a new bid, or "exit" to end the session.' };
          }
        }

      default:
        return { text: 'I’m sorry, I didn’t quite catch that. Could you clarify?' };
    }
  };

  useEffect(() => {
    if (!multiSelectMode && !singleSelectMode && !sessionEnded && open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, multiSelectMode, singleSelectMode, sessionEnded, open]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleMinimize = () => {
    setOpen(false);
  };

  const handleMaximize = () => {
    setMaximized((prev) => !prev);
  };

  const handleCloseWindow = () => {
    setOpen(false);
  };

  const chatBoxStyles = maximized
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'background.paper',
        boxShadow: 4,
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1300,
      }
    : {
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 350,
        height: 600, // Increased height to accommodate role assignments
        bgcolor: 'background.paper',
        boxShadow: 4,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1300,
      };

  return (
    <>
      {!open && (
        <IconButton
          onClick={toggleChat}
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            zIndex: 1300,
            boxShadow: 3,
          }}
          aria-label="Open Chatbot"
        >
          <ChatBubbleOutlineIcon />
        </IconButton>
      )}
      {open && (
        <Box sx={chatBoxStyles}>
          {/* Header */}
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center' }}>
            <SmartToyIcon sx={{ mr: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
              Bid Assistant
            </Typography>
            <IconButton onClick={handleMinimize} sx={{ color: 'white' }} aria-label="Minimize Chatbot">
              <MinimizeIcon />
            </IconButton>
            <IconButton onClick={handleMaximize} sx={{ color: 'white' }} aria-label="Toggle Fullscreen">
              {maximized ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            <IconButton onClick={handleCloseWindow} sx={{ color: 'white' }} aria-label="Close Chatbot">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Message Area */}
          <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: 'grey.100' }}>
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: isUser ? 'primary.main' : 'secondary.main',
                      color: 'white',
                      ml: isUser ? 1 : 0,
                      mr: isUser ? 0 : 1,
                    }}
                  >
                    {isUser ? <AccountCircleIcon /> : <SmartToyIcon />}
                  </Avatar>
                  <Box
                    sx={{
                      bgcolor: isUser ? 'primary.main' : 'grey.50',
                      color: isUser ? 'white' : 'text.primary',
                      p: 1.5,
                      borderRadius: 2,
                      maxWidth: maximized ? '60%' : '80%',
                      boxShadow: 1,
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: isUser ? 'white' : 'inherit',
                      }}
                    >
                      {msg.text}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          {(multiSelectMode || singleSelectMode) && (
            <Box sx={{ p: 2, borderTop: '1px solid #ccc', display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'white' }}>
              {multiSelectMode && <Typography variant="body2">Select one or more options:</Typography>}
              {singleSelectMode && <Typography variant="body2">Select one option:</Typography>}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {multiSelectOptions.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    onClick={() => {
                      if (singleSelectMode) {
                        handleSendMessage(option);
                      } else {
                        setSelectedOptions((prev) =>
                          prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
                        );
                      }
                    }}
                    color={selectedOptions.includes(option) ? 'primary' : 'default'}
                    variant={selectedOptions.includes(option) || singleSelectMode ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
              {allowCustomAddition && multiSelectMode && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add custom item..."
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    aria-label="Add custom item"
                  />
                  <Button variant="contained" onClick={() => {
                    if (customItem.trim() !== '' && !multiSelectOptions.includes(customItem.trim())) {
                      setMultiSelectOptions((prev) => [...prev, customItem.trim()]);
                      setSelectedOptions((prev) => [...prev, customItem.trim()]);
                      setCustomItem('');
                    }
                  }} aria-label="Add custom item">
                    Add
                  </Button>
                </Box>
              )}
              {multiSelectMode && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" color="primary" onClick={() => {
                    if (selectedOptions.length === 0) {
                      addMessage('bot', 'Please select at least one option before confirming.');
                      return;
                    }
                    const finalSelection = selectedOptions.join(', ');
                    handleSendMessage(finalSelection);
                  }} aria-label="Confirm Selection">
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm'}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {!multiSelectMode && !singleSelectMode && !sessionEnded && (
            <Box
              component="form"
              sx={{ p: 2, borderTop: '1px solid #ccc', display: 'flex', gap: 1, bgcolor: 'white' }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading) {
                  handleSendMessage(input);
                }
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder={loading ? "Please wait..." : "Type your message..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading) {
                      handleSendMessage(input);
                    }
                  }
                }}
                disabled={loading}
                inputRef={inputRef}
                aria-label="Chat input"
              />
              <Button variant="contained" color="primary" onClick={() => !loading && handleSendMessage(input)} disabled={loading} aria-label="Send Message">
                {loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Snackbar for User Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Chatbot;