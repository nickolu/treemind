import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import Tree from '../Tree';
import Node from '../Node';

const dimensions = { width: 1168, height: 800 };

function nodeHtml(children: string) {
  return `<foreignObject width="150" height="50" x="-75" y="-25"><div>
    <div class="node-header" style="background-color: #f0f0f0; padding: 5px; border-radius: 5px; cursor: grab;"> </div>
    <div class="node-content">${children}</div>
  </div></foreignObject>`;
}

export default function D3MindMap({ treeData }) {
  const svgRef = useRef(null);

  console.log('Component rendering with treeData:', treeData);
  const stringifiedTreeData = JSON.stringify(treeData);
  useEffect(() => {
    console.log('Effect running with treeData:', treeData);
    if (!svgRef.current) return;

    // Clear any existing SVG content more thoroughly
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create new SVG container
    const container = svg
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .append("g")
      .attr("transform", `translate(100, 0)`);

    // Create the tree layout
    const treeLayout = d3.tree()
      .size([dimensions.height, dimensions.width - 200]);

    // Create the hierarchy from the data
    const root = d3.hierarchy(treeData);
    const nodes = treeLayout(root);

    // Create links
    container.selectAll(".link")
      .data(nodes.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<Node>, d3.HierarchyPointNode<Node>>()
        .x(d => d.y)
        .y(d => d.x)
      );

    // Create node groups
    const nodeGroups = container.selectAll(".node")
      .data(nodes.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Create foreign objects for HTML content
    nodeGroups.selectAll("foreignObject")
      .data(d => [d])
      .join("foreignObject")
      .attr("width", 150)
      .attr("height", 50)
      .attr("x", -75)
      .attr("y", -25)
      .html((d: d3.HierarchyPointNode<Node>) => nodeHtml(d.data.htmlContent))
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px")
      .style("overflow", "hidden");

    // Add drag behavior
    const drag = d3.drag<SVGGElement, d3.HierarchyPointNode<Node>>()
      .on("drag", (event, d) => {


        // Update coordinates based on drag delta
        d.x += event.dy;  // Use dy for x because we're in a horizontal tree
        d.y += event.dx;  // Use dx for y because we're in a horizontal tree

        // Update node position
        d3.select(event.sourceEvent.target.closest(".node"))
          .attr("transform", `translate(${d.y},${d.x})`);

        // Update links
        container.selectAll(".link")
          .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<Tree>, d3.HierarchyPointNode<Tree>>()
            .x(d => d.y)
            .y(d => d.x));
      });

    // Apply drag behavior to nodes
    nodeGroups.call(drag);

    // Cleanup function
    return () => {
      svg.selectAll("*").remove();
    };

  }, [stringifiedTreeData, treeData]); 

  return (
    <div className="mind-map-container" style={{width: dimensions.width, height: dimensions.height, border: '1px solid #ccc'}}>
      <svg 
        ref={svgRef}
        key={JSON.stringify(treeData)}
      ></svg>
    </div>
  );
}
