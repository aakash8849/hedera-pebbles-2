import * as d3 from 'd3';

export function createColorScale() {
  return d3.scaleOrdinal()
    .domain(['high', 'medium', 'low'])
    .range(['#FF3B9A', '#7A73FF', '#42C7FF']);
}

export function getNodeCategory(value, maxBalance) {
  const ratio = value / maxBalance;
  if (ratio > 0.1) return 'high';
  if (ratio > 0.01) return 'medium';
  return 'low';
}

export function createForceSimulation(nodes, links) {
  return d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id(d => d.id)
      .distance(d => 100 / (Math.sqrt(d.value) + 1)))
    .force('charge', d3.forceManyBody()
      .strength(d => -100 * Math.sqrt(d.radius)))
    .force('x', d3.forceX())
    .force('y', d3.forceY())
    .force('collision', d3.forceCollide()
      .radius(d => d.radius + 2));
}

export function createZoom(svg) {
  return d3.zoom()
    .scaleExtent([0.1, 10])
    .on('zoom', (event) => {
      svg.selectAll('g').attr('transform', event.transform);
    });
}

export function calculateCurvedPath(d) {
  const dx = d.target.x - d.source.x;
  const dy = d.target.y - d.source.y;
  const dr = Math.sqrt(dx * dx + dy * dy) * 2;
  return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
}