import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { createColorScale, getNodeCategory } from '../../utils/d3Utils';
import { formatDate } from '../../utils/dateUtils';

function NodeGraph({ data }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data?.nodes?.length) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    // Get container dimensions
    const containerWidth = window.innerWidth - 320;
    const containerHeight = window.innerHeight;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .attr('viewBox', [-containerWidth / 2, -containerHeight / 2, containerWidth, containerHeight])
      .attr('style', 'max-width: 100%; height: 100vh; background: #13111C;');

    // Add container for zoom
    const zoomGroup = svg.append('g');

    const color = createColorScale();
    const maxBalance = Math.max(...data.nodes.map(n => n.value));

    // Scale node sizes based on value
    const nodeScale = d3.scaleSqrt()
      .domain([0, maxBalance])
      .range([15, 60]);

    // Create force simulation with adjusted parameters
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id(d => d.id)
        .distance(180))
      .force('charge', d3.forceManyBody()
        .strength(-500))
      .force('x', d3.forceX())
      .force('y', d3.forceY())
      .force('collision', d3.forceCollide().radius(d => nodeScale(d.value) + 5));

    // Add arrow markers
    svg.append('defs').selectAll('marker')
      .data(['arrow'])
      .join('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#ffffff')
      .attr('d', 'M0,-4L8,0L0,4');

    // Create straight links with better visibility
    const link = zoomGroup.append('g')
      .selectAll('path')
      .data(data.links)
      .join('path')
      .attr('stroke', d => d.involvesTreasury ? '#FFD700' : '#4A90E2')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.2)
      .attr('fill', 'none')
      .attr('marker-end', 'url(#arrow)');

    // Create nodes with glowing effect
    const node = zoomGroup.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('r', d => nodeScale(d.value))
      .attr('fill', d => d.isTreasury ? '#FFD700' : color(getNodeCategory(d.value, maxBalance)))
      .attr('stroke', '#2D2B38')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8)
      .attr('fill-opacity', 0.7);

    // Add labels
    const label = zoomGroup.append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none')
      .text(d => d.id.substring(0, 8) + '...');

    // Add hover effects and tooltips
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Update positions on simulation tick with straight lines
    simulation.on('tick', () => {
      link.attr('d', d => {
        const sourceX = d.source.x;
        const sourceY = d.source.y;
        const targetX = d.target.x;
        const targetY = d.target.y;
        
        // Calculate the angle for proper arrow placement
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const angle = Math.atan2(dy, dx);
        
        // Adjust start and end points to account for node radius
        const sourceRadius = nodeScale(d.source.value);
        const targetRadius = nodeScale(d.target.value);
        
        const startX = sourceX + (sourceRadius * Math.cos(angle));
        const startY = sourceY + (sourceRadius * Math.sin(angle));
        const endX = targetX - (targetRadius * Math.cos(angle));
        const endY = targetY - (targetRadius * Math.sin(angle));
        
        return `M${startX},${startY}L${endX},${endY}`;
      });
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Enhanced hover effects
    node.on('mouseover', (event, d) => {
      tooltip.transition()
        .duration(200)
        .style('opacity', .9);
      tooltip.html(`
        <div class="bg-gray-800 text-white p-3 rounded-lg shadow-lg">
          <div>Account: ${d.id}</div>
          <div>Balance: ${d.value.toLocaleString()}</div>
          ${d.isTreasury ? '<div class="text-yellow-400">Treasury Wallet</div>' : ''}
        </div>
      `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');

      // Highlight connected nodes and links
      const connectedNodes = new Set();
      data.links.forEach(link => {
        if (link.source.id === d.id) {
          connectedNodes.add(link.target.id);
        }
        if (link.target.id === d.id) {
          connectedNodes.add(link.source.id);
        }
      });

      node.attr('opacity', n => connectedNodes.has(n.id) || n.id === d.id ? 1 : 0.2);
      link.attr('opacity', l => 
        l.source.id === d.id || l.target.id === d.id ? 0.8 : 0.1
      )
      .attr('stroke-width', l =>
        l.source.id === d.id || l.target.id === d.id ? 2 : 1.2
      );
      label.attr('opacity', n => connectedNodes.has(n.id) || n.id === d.id ? 1 : 0.2);
    })
    .on('mouseout', () => {
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
      
      node.attr('opacity', 1);
      link
        .attr('opacity', 0.4)
        .attr('stroke-width', 1.2);
      label.attr('opacity', 1);
    });

    // Add drag behavior
    node.call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      });

    svg.call(zoom);

    return () => {
      simulation.stop();
      d3.select('body').selectAll('.tooltip').remove();
    };
  }, [data]);

  return <svg ref={svgRef} className="w-full h-screen" />;
}

export default NodeGraph;