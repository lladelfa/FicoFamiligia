import type { Individual, Family } from "./gedcomProcessor";

export interface TreeNode {
  id: string; // Family ID (e.g. '@F1@') or Individual ID (e.g. '@I7@')
  type: "union" | "single";
  memberIds: string[]; // [husbandId, wifeId] or [indiId]
  level: number;
  x: number;
  y: number;
  width: number;
}

export interface TreeLine {
  id: string;
  path: string; // SVG path string
}

// Width constants
const UNION_WIDTH = 340;
const SINGLE_WIDTH = 180;
const ROW_SPACING = 260; // Vertical gap between generations
const COL_SPACING = 60;  // Horizontal gap between nodes

export function computeTreeLayout(
  individuals: Record<string, Individual>,
  families: Record<string, Family>
): { nodes: TreeNode[]; lines: TreeLine[]; maxLevel: number } {
  if (Object.keys(individuals).length === 0) {
    return { nodes: [], lines: [], maxLevel: 0 };
  }

  // 1. Assign generation levels (depth) to each individual
  const levels: Record<string, number> = {};

  // Find individuals who are NOT children in any family
  const allChildren = new Set<string>();
  Object.values(families).forEach(fam => {
    fam.children.forEach(cid => allChildren.add(cid));
  });

  const roots = Object.keys(individuals).filter(id => !allChildren.has(id));

  // Recursive level assigner
  function assignLevel(indiId: string, currentLevel: number) {
    // If we've visited this node and assigned a level, we keep the maximum
    // (this handles cases where descendants connect back or multi-level loops)
    if (levels[indiId] !== undefined && levels[indiId] >= currentLevel) {
      return;
    }
    
    levels[indiId] = currentLevel;

    // Find families where this individual is a parent
    Object.values(families).forEach(fam => {
      if (fam.husbandId === indiId || fam.wifeId === indiId) {
        // Assign children to the next level
        fam.children.forEach(childId => {
          assignLevel(childId, currentLevel + 1);
        });
      }
    });
  }

  // If roots is empty (e.g., circular loops, which shouldn't happen), fallback to any node
  const startingRoots = roots.length > 0 ? roots : [Object.keys(individuals)[0]];
  startingRoots.forEach(rootId => assignLevel(rootId, 0));

  // 2. Group into TreeNodes (Unions vs. Singles)
  const nodes: TreeNode[] = [];
  const marriedIndis = new Set<string>();

  // Create union nodes
  Object.values(families).forEach(fam => {
    const husbId = fam.husbandId;
    const wifeId = fam.wifeId;
    
    let level = 0;
    const memberIds: string[] = [];
    
    if (husbId && individuals[husbId]) {
      memberIds.push(husbId);
      marriedIndis.add(husbId);
      level = Math.max(level, levels[husbId] ?? 0);
    }
    if (wifeId && individuals[wifeId]) {
      memberIds.push(wifeId);
      marriedIndis.add(wifeId);
      level = Math.max(level, levels[wifeId] ?? 0);
    }

    nodes.push({
      id: fam.id,
      type: "union",
      memberIds,
      level,
      x: 0,
      y: 0,
      width: UNION_WIDTH
    });
  });

  // Create single nodes (for individuals never married)
  Object.keys(individuals).forEach(id => {
    if (!marriedIndis.has(id)) {
      nodes.push({
        id,
        type: "single",
        memberIds: [id],
        level: levels[id] ?? 0,
        x: 0,
        y: 0,
        width: SINGLE_WIDTH
      });
    }
  });

  if (nodes.length === 0) {
    return { nodes: [], lines: [], maxLevel: 0 };
  }

  const maxLevel = Math.max(...nodes.map(n => n.level));

  // 3. Group nodes by generation level
  const levelsGrid: Record<number, TreeNode[]> = {};
  for (let l = 0; l <= maxLevel; l++) {
    levelsGrid[l] = [];
  }
  nodes.forEach(node => {
    levelsGrid[node.level]?.push(node);
  });

  // 4. Sort nodes horizontally inside each level
  // Heuristic: sort children based on the horizontal index of their parents in the level above
  for (let l = 1; l <= maxLevel; l++) {
    const parentLevelNodes = levelsGrid[l - 1];
    
    levelsGrid[l].sort((a, b) => {
      // Find parent X coordinate for Node A
      let aParentX = 0;
      let aHasParent = false;
      const aMembers = a.memberIds;
      
      // Look for a family in level above that contains a's members as children
      for (const parentNode of parentLevelNodes) {
        if (parentNode.type === "union") {
          const fam = families[parentNode.id];
          if (fam && fam.children.some(cid => aMembers.includes(cid))) {
            aParentX = parentNode.x;
            aHasParent = true;
            break;
          }
        }
      }

      // Find parent X coordinate for Node B
      let bParentX = 0;
      let bHasParent = false;
      const bMembers = b.memberIds;
      
      for (const parentNode of parentLevelNodes) {
        if (parentNode.type === "union") {
          const fam = families[parentNode.id];
          if (fam && fam.children.some(cid => bMembers.includes(cid))) {
            bParentX = parentNode.x;
            bHasParent = true;
            break;
          }
        }
      }

      if (aHasParent && bHasParent) {
        return aParentX - bParentX;
      }
      return 0; // Keep original order if parentless
    });
  }

  // 5. Position nodes horizontally (centering each row around X=0)
  for (let l = 0; l <= maxLevel; l++) {
    const rowNodes = levelsGrid[l];
    if (rowNodes.length === 0) continue;

    // Calculate total width of the row, including gaps
    let totalWidth = 0;
    for (let i = 0; i < rowNodes.length; i++) {
      totalWidth += rowNodes[i].width;
      if (i < rowNodes.length - 1) {
        totalWidth += COL_SPACING;
      }
    }

    // Centering calculation: start placing from leftX
    let currentX = -totalWidth / 2;
    const yCoord = l * ROW_SPACING + 100; // Add offset for top padding

    rowNodes.forEach(node => {
      node.x = currentX + node.width / 2;
      node.y = yCoord;
      currentX += node.width + COL_SPACING;
    });
  }

  // 6. Draw connection lines (Bezier S-curves)
  const lines: TreeLine[] = [];
  
  // Create mapping of individual ID to the node they belong to
  const indiToNodeMap: Record<string, TreeNode> = {};
  nodes.forEach(node => {
    node.memberIds.forEach(mid => {
      indiToNodeMap[mid] = node;
    });
  });

  // Loop through families to draw parent-to-child links
  Object.values(families).forEach(fam => {
    // Find the union node representing this family
    const parentNode = nodes.find(n => n.id === fam.id);
    if (!parentNode) return;

    // Start coordinate at the bottom-center of the parent union node
    const parentCardHeight = 130; // height of the couple node card
    const startX = parentNode.x;
    const startY = parentNode.y + parentCardHeight / 2;

    fam.children.forEach(childId => {
      // Find the node representing the child (could be a single or a union they are in)
      const childNode = indiToNodeMap[childId];
      if (!childNode) return;

      // End coordinate at the top-center of the child card
      const childCardHeight = childNode.type === "union" ? 130 : 90;
      const endX = childNode.type === "union" 
        ? childNode.x + (childNode.memberIds.indexOf(childId) === 0 ? -80 : 80) // offset towards their side of couple card
        : childNode.x;
      const endY = childNode.y - childCardHeight / 2;

      // S-curve Bezier calculations
      const midY = (startY + endY) / 2;
      const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

      lines.push({
        id: `line-${fam.id}-${childId}`,
        path
      });
    });
  });

  return { nodes, lines, maxLevel };
}
