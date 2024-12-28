// src/utils/dataProcessing.js

export const determineQuadrant = (votes, impactScore) => {
  const midVotes = 5;
  const midImpact = 5;

  if (votes >= midVotes && impactScore >= midImpact) return 'Q1'; // High Votes, High Impact
  if (votes < midVotes && impactScore >= midImpact) return 'Q2';  // Low Votes, High Impact
  if (votes >= midVotes && impactScore < midImpact) return 'Q3';  // High Votes, Low Impact
  return 'Q4';                                                 // Low Votes, Low Impact
};

export const getColorByType = (type) => {
  switch (type.toLowerCase()) {
    case 'strength':
    case 'strengths':
      return '#FFFACD'; // Lemon Chiffon (Light Yellow)
    case 'weakness':
    case 'weaknesses':
      return '#FFC0CB'; // Pink (Light Red)
    case 'opportunity':
    case 'opportunities':
      return '#E0FFFF'; // Light Cyan (Light Green alternative)
    case 'threat':
    case 'threats':
      return '#E6E6FA'; // Lavender (Light Blue alternative)
    default:
      return '#FFFFFF'; // White
  }
};