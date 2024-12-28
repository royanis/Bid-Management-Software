// src/components/workshop/steps/SWOTVisualization.jsx

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Modal, Typography, Box } from '@mui/material';

/**
 * Shows 2x2 quadrant rectangles:
 * - Strengths, Weaknesses, Opps, Threats
 * - Each item as a circle with radius based on votes
 * - Only top 5 items per quadrant (passed from parent)
 */
const SWOTVisualization = ({ strengths, weaknesses, opportunities, threats }) => {
  const svgRef = useRef();
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const data = [
      { category: 'Strengths', items: strengths },
      { category: 'Weaknesses', items: weaknesses },
      { category: 'Opportunities', items: opportunities },
      { category: 'Threats', items: threats },
    ];

    const w = 1200;
    const h = 800;
    const margin = { top: 100, right: 100, bottom: 100, left: 100 };

    const svg = d3
      .select(svgRef.current)
      .attr('viewBox', `0 0 ${w} ${h}`)
      .style('width', '100%')
      .style('height', 'auto');

    // Clear old rendering
    svg.selectAll('*').remove();

    const group = svg.append('g');

    const quadrants = [
      { name: 'Strengths', x: 0, y: 0, color: '#4caf50' },
      { name: 'Weaknesses', x: 1, y: 0, color: '#f44336' },
      { name: 'Opportunities', x: 0, y: 1, color: '#2196f3' },
      { name: 'Threats', x: 1, y: 1, color: '#ff9800' },
    ];

    const qWidth = (w - margin.left - margin.right) / 2;
    const qHeight = (h - margin.top - margin.bottom) / 2;

    // Draw quadrant rectangles
    quadrants.forEach((quad) => {
      group
        .append('rect')
        .attr('x', margin.left + quad.x * qWidth)
        .attr('y', margin.top + quad.y * qHeight)
        .attr('width', qWidth - 10)
        .attr('height', qHeight - 10)
        .attr('fill', '#fafafa')
        .attr('stroke', quad.color)
        .attr('stroke-width', 3)
        .attr('rx', 10)
        .attr('ry', 10);

      group
        .append('text')
        .attr('x', margin.left + quad.x * qWidth + qWidth / 2)
        .attr('y', margin.top + quad.y * qHeight + 40)
        .attr('text-anchor', 'middle')
        .attr('font-size', 24)
        .attr('font-weight', 'bold')
        .attr('fill', quad.color)
        .text(quad.name);
    });

    // function to position item in a small grid of 3 columns
    const positionItem = (idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      return {
        x: 60 + col * 100,
        y: 60 + row * 100,
      };
    };

    data.forEach((qd) => {
      const quad = quadrants.find((q) => q.name === qd.category);
      if (!quad) return;

      qd.items.forEach((item, i) => {
        const { x, y } = positionItem(i);
        const xPos = margin.left + quad.x * qWidth + x;
        const yPos = margin.top + quad.y * qHeight + y;

        // radius scaled by votes
        const radius = Math.min(40, 10 + (item.votes || 0));

        const itemGroup = group
          .append('g')
          .attr('transform', `translate(${xPos}, ${yPos})`)
          .style('cursor', 'pointer')
          .on('click', () => setSelectedItem(item));

        itemGroup
          .append('circle')
          .attr('r', 0)
          .attr('fill', quad.color)
          .attr('stroke', '#333')
          .attr('stroke-width', 1)
          .transition()
          .duration(600)
          .attr('r', radius);

        const label =
          item.text.length > 12 ? item.text.slice(0, 12) + '...' : item.text;
        itemGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('alignment-baseline', 'middle')
          .attr('fill', '#000')
          .attr('font-size', 12)
          .text(label);
      });
    });

    return () => {
      svg.selectAll('*').remove();
    };
  }, [strengths, weaknesses, opportunities, threats]);

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <svg ref={svgRef} />
      {selectedItem && (
        <Modal
          open={Boolean(selectedItem)}
          onClose={() => setSelectedItem(null)}
          aria-labelledby="swot-modal-item"
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 340,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 24,
              p: 3,
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              {selectedItem.text}
            </Typography>
            <Typography variant="body2">
              <strong>Votes:</strong> {selectedItem.votes || 0}
            </Typography>
          </Box>
        </Modal>
      )}
    </Box>
  );
};

export default SWOTVisualization;