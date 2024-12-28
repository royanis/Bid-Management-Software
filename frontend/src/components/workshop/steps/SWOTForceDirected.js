// src/components/workshop/steps/SWOTForceDirected.jsx

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';
import SWOTBubbleEditDialog from './SWOTBubbleEditDialog';

const width = 1200;
const height = 700;

// Quadrant center positions
const clusterCenters = {
  strengths: { x: width * 0.25, y: height * 0.3 },
  weaknesses: { x: width * 0.75, y: height * 0.3 },
  opportunities: { x: width * 0.25, y: height * 0.7 },
  threats: { x: width * 0.75, y: height * 0.7 },
};

// Pastel background colors for each quadrant
const quadrantColors = {
  strengths: '#EBFAEB',    // Light pastel green
  weaknesses: '#FFECEC',   // Light pastel red
  opportunities: '#EBF3FA',// Light pastel blue
  threats: '#FFF4E0',      // Light pastel orange
};

// Node fill colors for better visibility
const colorMap = {
  strengths: '#4caf50',
  weaknesses: '#f44336',
  opportunities: '#2196f3',
  threats: '#ff9800',
};

/**
 * Compute radius based on text length and votes.
 */
function computeRadius(d) {
  const textLen = (d.text || '').length;
  const base = 30; // Increased base for larger bubbles
  let r = base + textLen * 1.2 + (d.votes || 0) * 0.5;
  return Math.min(r, 100); // Increased maximum radius
}

const SWOTForceDirected = ({ items, setItems }) => {
  const svgRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const simulationRef = useRef(null);

  /**
   * Main D3 Rendering Effect
   */
  useEffect(() => {
    if (!items) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear old content

    // 1) Draw quadrant backgrounds (rectangles)
    const quadrantGroup = svg.append('g').attr('class', 'quadrant-backgrounds');

    // Strengths
    quadrantGroup
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width / 2)
      .attr('height', height / 2)
      .attr('fill', quadrantColors.strengths)
      .attr('opacity', 0.6);

    // Weaknesses
    quadrantGroup
      .append('rect')
      .attr('x', width / 2)
      .attr('y', 0)
      .attr('width', width / 2)
      .attr('height', height / 2)
      .attr('fill', quadrantColors.weaknesses)
      .attr('opacity', 0.6);

    // Opportunities
    quadrantGroup
      .append('rect')
      .attr('x', 0)
      .attr('y', height / 2)
      .attr('width', width / 2)
      .attr('height', height / 2)
      .attr('fill', quadrantColors.opportunities)
      .attr('opacity', 0.6);

    // Threats
    quadrantGroup
      .append('rect')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('width', width / 2)
      .attr('height', height / 2)
      .attr('fill', quadrantColors.threats)
      .attr('opacity', 0.6);

    // 2) Label each quadrant
    svg
      .append('text')
      .text('Strengths')
      .attr('x', width * 0.25)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold');

    svg
      .append('text')
      .text('Weaknesses')
      .attr('x', width * 0.75)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold');

    svg
      .append('text')
      .text('Opportunities')
      .attr('x', width * 0.25)
      .attr('y', height / 2 + 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold');

    svg
      .append('text')
      .text('Threats')
      .attr('x', width * 0.75)
      .attr('y', height / 2 + 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20)
      .attr('font-weight', 'bold');

    // 3) Setup data for simulation
    const dataNodes = items.map((item) => ({
      ...item,
      x: item.position?.x ?? Math.random() * width,
      y: item.position?.y ?? Math.random() * height,
    }));

    const simulation = d3
      .forceSimulation(dataNodes)
      .force('charge', d3.forceManyBody().strength(-100)) // Increased strength for better separation
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'clusterX',
        d3.forceX().x((d) => clusterCenters[d.cluster].x).strength(0.1)
      )
      .force(
        'clusterY',
        d3.forceY().y((d) => clusterCenters[d.cluster].y).strength(0.1)
      )
      .force('collision', d3.forceCollide().radius((d) => computeRadius(d) + 5)) // Prevent overlap
      .alphaDecay(0.03)
      .on('tick', ticked)
      .on('end', () => {
        // Update items once simulation ends
        const updatedItems = dataNodes.map((node) => ({
          ...node,
          position: { x: node.x, y: node.y },
        }));
        setItems(updatedItems);
      });

    simulationRef.current = simulation;

    // 4) Create a <g> per node, with circle + text
    const nodeG = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(dataNodes, (d) => d.id) // Key function for D3
      .join('g')
      .attr('class', 'bubble-group')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.03).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            // Re-check cluster based on final position
            let minDist = Infinity;
            let newCluster = d.cluster;
            for (const c of Object.keys(clusterCenters)) {
              const dx = d.x - clusterCenters[c].x;
              const dy = d.y - clusterCenters[c].y;
              const dist = dx * dx + dy * dy;
              if (dist < minDist) {
                minDist = dist;
                newCluster = c;
              }
            }
            if (newCluster !== d.cluster) {
              d.cluster = newCluster;
              // Restart simulation with updated cluster
              simulation.alpha(1).restart();
            }
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedItem(d);
      });

    // For each group, append a circle
    nodeG
      .append('circle')
      .attr('class', 'bubble-node')
      .attr('r', (d) => computeRadius(d))
      .attr('fill', (d) => colorMap[d.cluster] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Then add text on top with multi-line support
    nodeG
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('pointer-events', 'none') // so we can drag circle easily
      .attr('font-size', 12) // Reduced font size for better fit
      .attr('fill', '#fff')
      .selectAll('tspan')
      .data(d => d.text.split(' ')) // Split text into words
      .enter()
      .append('tspan')
      .attr('x', 0)
      .attr('y', (d, i) => i * 15) // Adjust line spacing as needed
      .text(d => d);

    // Tick function
    function ticked() {
      nodeG.attr('transform', (d) => `translate(${d.x},${d.y})`);
    }

    // Cleanup on unmount or items change
    return () => {
      simulation.stop();
    };
  }, [items, setItems]); // Added 'items' as a dependency

  /**
   * Window Resize Effect
   */
  useEffect(() => {
    const handleResize = () => {
      // Optional: Implement dynamic resizing if needed
      // Currently, width and height are constants. Adjust if responsive design is desired.
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  /**
   * Handle Dialog Close
   */
  const handleDialogClose = (action, updatedItem) => {
    if (action === 'cancel') {
      setSelectedItem(null);
      return;
    }
    if (action === 'save') {
      // Merge changes
      const updated = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
      setItems(updated);
      setSelectedItem(null);
    }
    if (action === 'delete') {
      const updated = items.filter((it) => it.id !== updatedItem.id);
      setItems(updated);
      setSelectedItem(null);
    }
  };

  return (
    <Box sx={{ width: '100%', height: height, position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        aria-label="SWOT Force-Directed Graph"
        role="img"
      />
      {selectedItem && (
        <SWOTBubbleEditDialog
          open
          item={selectedItem}
          onClose={handleDialogClose}
        />
      )}
    </Box>
  );
};

export default SWOTForceDirected;