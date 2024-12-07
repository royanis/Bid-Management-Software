import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField, IconButton, Button, Avatar, Chip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MinimizeIcon from '@mui/icons-material/Minimize';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { saveBidData, listFiles, moveToArchive } from '../services/apiService'; 
import '../styles/Chatbot.css';

const DEFAULT_DELIVERABLES = [
  'Solution PPT', 
  'Rate Card', 
  'Commercial Proposal', 
  'Resource Profiles', 
  'Executive Summary', 
  'Supplier Profile Questions'
];

const DEFAULT_TEAM_ROLES = [
  'Deal Lead', 
  'Deal Shaper', 
  'Deal Coach', 
  'Deal Capture', 
  'Deal Negotiator', 
  'Developer', 
  'Designer', 
  'PM', 
  'QA'
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

  const [currentDeliverableIndex, setCurrentDeliverableIndex] = useState(0);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [singleSelectMode, setSingleSelectMode] = useState(false);
  const [multiSelectOptions, setMultiSelectOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [allowCustomAddition, setAllowCustomAddition] = useState(false);
  const [customItem, setCustomItem] = useState('');

  const toggleChat = () => setOpen((prev) => !prev);

  const addMessage = (sender, text, suggestions = []) => {
    setMessages((prev) => [...prev, { sender, text, suggestions }]);
  };

  const isValidDate = (date) => !isNaN(new Date(date).getTime());
  const isAfterDate = (date1, date2) => new Date(date1) > new Date(date2);
  const isBetweenDates = (date, start, end) => {
    const d = new Date(date);
    return d >= new Date(start) && d <= new Date(end);
  };

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

  const finalizeBid = async () => {
    try {
      const bidNameBase = `${bidDetails.clientName}_${bidDetails.opportunityName}`;
      const existingFiles = await listFiles();
      const currentVersion = existingFiles
        .filter((file) => file.id.startsWith(bidNameBase))
        .map((file) => parseInt(file.id.match(/Version (\d+)/)?.[1], 10) || 0);
      const newVersion = Math.max(0, ...currentVersion) + 1;
      const newBidId = `${bidNameBase}_Version ${newVersion}`;
      const newBidData = { ...bidDetails, bidId: newBidId };
      if (currentVersion.length > 0) {
        const lastVersion = Math.max(...currentVersion);
        const previousBidId = `${bidNameBase}_Version ${lastVersion}`;
        await moveToArchive(previousBidId);
      }
      await saveBidData(newBidData);
      return { text: `Bid saved successfully as ${newBidId}!\nType "all done done exit" to end this session.` };
    } catch (error) {
      console.error('Error saving bid:', error);
      return { text: 'An error occurred while saving the bid. Please try again.' };
    }
  };

  const handleEditRequest = (input) => {
    // Placeholder for edit logic
    return { text: 'Editing functionality is not implemented in this example.' };
  };

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
          setContext('deliverables');
          return {
            text: 'Please select your deliverables from the list below. You can select multiple and add your own.',
            multiSelect: true,
            multiSelectOptions: DEFAULT_DELIVERABLES,
            allowCustom: true
          };
        } else {
          return { text: 'Invalid Proposal Submission Date. Ensure it is after the RFP Issue Date.' };
        }

      case 'deliverables':
        {
          const chosenDeliverables = input.split(',').map((d) => d.trim()).filter(Boolean);
          if (chosenDeliverables.length === 0) {
            return { text: 'Please provide at least one deliverable.' };
          } else {
            // Initialize empty activities arrays for chosen deliverables
            const newActivities = {};
            chosenDeliverables.forEach(d => {
              newActivities[d] = []; // empty; will fill based on user selection later
            });
            setBidDetails((prev) => ({ ...prev, deliverables: chosenDeliverables, activities: newActivities }));

            // Ask for activities for the first deliverable
            const firstDeliverable = chosenDeliverables[0];
            setContext(`activities_for_${firstDeliverable}`);
            const suggestions = SUGGESTED_ACTIVITIES[firstDeliverable] || [];
            return {
              text: `Select activities for ${firstDeliverable} (or add your own):`,
              multiSelect: true,
              multiSelectOptions: suggestions,
              allowCustom: true
            };
          }
        }

      default:
        if (context && context.startsWith('activities_for_')) {
          const deliverable = context.replace('activities_for_', '');
          const chosenActivities = input.split(',').map((a) => a.trim()).filter(Boolean);
          if (chosenActivities.length === 0) {
            return { text: 'Please select at least one activity.' };
          } else {
            const currentActivities = bidDetails.activities[deliverable] || [];
            chosenActivities.forEach((act) => {
              if (!currentActivities.find((c) => c.name.toLowerCase() === act.toLowerCase())) {
                currentActivities.push({ name: act, owner: 'Unassigned', status: 'Open', startDate: '', endDate: '', remarks: '' });
              }
            });
            // Update activities for this deliverable
            setBidDetails((prev) => ({ ...prev, activities: { ...prev.activities, [deliverable]: currentActivities }}));

            const { deliverables } = bidDetails;
            const currentIndex = deliverables.indexOf(deliverable);
            const nextIndex = currentIndex + 1;
            if (nextIndex < deliverables.length) {
              const nextDeliverable = deliverables[nextIndex];
              setContext(`activities_for_${nextDeliverable}`);
              const suggestions = SUGGESTED_ACTIVITIES[nextDeliverable] || [];
              return {
                text: `Select activities for ${nextDeliverable} (or add your own):`,
                multiSelect: true,
                multiSelectOptions: suggestions,
                allowCustom: true
              };
            } else {
              // All activities chosen for all deliverables
              // Now ask for team roles
              setContext('team');
              return {
                text: 'All activities chosen for selected deliverables.\nNow select team roles (you can add custom roles too):',
                multiSelect: true,
                multiSelectOptions: DEFAULT_TEAM_ROLES,
                allowCustom: true
              };
            }
          }
        }

        if (context === 'team') {
          const teamRoles = input.split(',').map((r) => r.trim()).filter(Boolean);
          if (teamRoles.length === 0) {
            return { text: 'Please select at least one team role.' };
          } else {
            const team = teamRoles.map((role) => ({ name: role, person: '' }));
            setBidDetails((prev) => ({ ...prev, team }));
            setContext('assign_person_names_for_roles');
            setCurrentRoleIndex(0);
            return { text: `What is the person's name for the role '${team[0].name}'?` };
          }
        }

        if (context === 'assign_person_names_for_roles') {
          const team = bidDetails.team;
          const role = team[currentRoleIndex].name;
          if (input.length < 2) {
            return { text: `Person's name too short. Please provide a valid name for role '${role}'` };
          }
          team[currentRoleIndex].person = input;
          setBidDetails((prev) => ({ ...prev, team }));

          const nextIndex = currentRoleIndex + 1;
          if (nextIndex < team.length) {
            setCurrentRoleIndex(nextIndex);
            return { text: `What is the person's name for the role '${team[nextIndex].name}'?` };
          } else {
            // All roles assigned names, now assign owners/dates etc. for chosen activities
            setCurrentDeliverableIndex(0);
            setCurrentActivityIndex(0);
            setContext('assign_activity_owner');
            const teamPersons = bidDetails.team.map((m) => m.person);
            const firstDeliverable = bidDetails.deliverables[0];
            return {
              text: `Who should be the owner of '${bidDetails.activities[firstDeliverable][0].name}' under '${firstDeliverable}'?`,
              singleSelect: true,
              singleSelectOptions: teamPersons
            };
          }
        }

        if (context === 'assign_activity_owner') {
          const d = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[d][currentActivityIndex];
          const teamPersons = bidDetails.team.map((m) => m.person);
          const chosenPerson = teamPersons.find((p) => p.toLowerCase() === input.toLowerCase());
          if (!chosenPerson) {
            return {
              text: `Please choose a valid owner.`,
              singleSelect: true,
              singleSelectOptions: teamPersons
            };
          }

          activity.owner = chosenPerson;
          setBidDetails({ ...bidDetails });
          setContext('assign_activity_start_date');
          return { text: `What is the start date for '${activity.name}'? (Format: YYYY-MM-DD)` };
        }

        if (context === 'assign_activity_start_date') {
          const d = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[d][currentActivityIndex];
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

        if (context === 'assign_activity_end_date') {
          const d = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[d][currentActivityIndex];
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

        if (context === 'assign_activity_status') {
          const d = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[d][currentActivityIndex];
          const chosenStatus = STATUS_OPTIONS.find((s) => s.toLowerCase() === input.toLowerCase());
          if (!chosenStatus) {
            return {
              text: `Please choose a valid status.`,
              singleSelect: true,
              singleSelectOptions: STATUS_OPTIONS
            };
          }

          activity.status = chosenStatus;
          setBidDetails({ ...bidDetails });
          setContext('assign_activity_remarks');
          return { text: `Any remarks for '${activity.name}'? (Type 'none' if no remarks)` };
        }

        if (context === 'assign_activity_remarks') {
          const d = bidDetails.deliverables[currentDeliverableIndex];
          const activity = bidDetails.activities[d][currentActivityIndex];
          activity.remarks = (input.toLowerCase() === 'none') ? '' : input;
          setBidDetails({ ...bidDetails });

          const nextActivityIndex = currentActivityIndex + 1;
          if (nextActivityIndex < bidDetails.activities[d].length) {
            setCurrentActivityIndex(nextActivityIndex);
            setContext('assign_activity_owner');
            const teamPersons = bidDetails.team.map((m) => m.person);
            return {
              text: `Who should be the owner of '${bidDetails.activities[d][nextActivityIndex].name}' under '${d}'?`,
              singleSelect: true,
              singleSelectOptions: teamPersons
            };
          } else {
            const deliverablesCount = bidDetails.deliverables.length;
            const nextDeliverableIndex = currentDeliverableIndex + 1;
            if (nextDeliverableIndex < deliverablesCount) {
              setCurrentDeliverableIndex(nextDeliverableIndex);
              setCurrentActivityIndex(0);
              setContext('assign_activity_owner');
              const teamPersons = bidDetails.team.map((m) => m.person);
              const nd = bidDetails.deliverables[nextDeliverableIndex];
              return {
                text: `Who should be the owner of '${bidDetails.activities[nd][0].name}' under '${nd}'?`,
                singleSelect: true,
                singleSelectOptions: teamPersons
              };
            } else {
              setContext('review');
              return {
                text:
                  `All activities now have owners and details.\n` +
                  `Here’s your final bid summary:\n` +
                  `**Client:** ${bidDetails.clientName}\n` +
                  `**Opportunity:** ${bidDetails.opportunityName}\n` +
                  `**Timeline:**\n- RFP Issue: ${bidDetails.timeline.rfpIssueDate}\n` +
                  `- QA Submission: ${bidDetails.timeline.qaSubmissionDate}\n` +
                  `- Proposal Submission: ${bidDetails.timeline.proposalSubmissionDate}\n` +
                  `**Deliverables:** ${bidDetails.deliverables.join(', ')}\n` +
                  `**Activities:**\n${formatActivities(bidDetails.activities)}\n` +
                  `**Team:** ${bidDetails.team.map((member) => `${member.name} (${member.person})`).join(', ')}\n\n` +
                  'Type "finalize" to save or "edit" to make changes. Type "all done done exit" to end the session after finalizing.'
              };
            }
          }
        }

        if (context === 'review') {
          const lowerInput = input.toLowerCase();
          if (lowerInput === 'finalize') {
            return await finalizeBid();
          } else if (lowerInput.startsWith('edit')) {
            return handleEditRequest(input);
          } else {
            return { text: 'Type "finalize" to save or "edit <field>" to make changes.' };
          }
        }

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading && !multiSelectMode && !singleSelectMode && !sessionEnded) {
      handleSendMessage(input);
    }
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
        height: 500,
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
            <IconButton onClick={handleMinimize} sx={{ color: 'white' }}>
              <MinimizeIcon />
            </IconButton>
            <IconButton onClick={handleMaximize} sx={{ color: 'white' }}>
              {maximized ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            <IconButton onClick={handleCloseWindow} sx={{ color: 'white' }}>
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
                  />
                  <Button variant="contained" onClick={() => {
                    if (customItem.trim() !== '' && !multiSelectOptions.includes(customItem.trim())) {
                      setMultiSelectOptions((prev) => [...prev, customItem.trim()]);
                      setSelectedOptions((prev) => [...prev, customItem.trim()]);
                      setCustomItem('');
                    }
                  }}>
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
                  }}>
                    Confirm
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
              />
              <Button variant="contained" color="primary" onClick={() => !loading && handleSendMessage(input)} disabled={loading}>
                <SendIcon />
              </Button>
            </Box>
          )}
        </Box>
      )}
    </>
  );
};

export default Chatbot;