import React, { useState, useMemo } from "react";
import { useFamily } from "../context/FamilyContext";
import { computeTreeLayout } from "../utils/treeLayout";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2, Heart, UserPlus, X } from "lucide-react";
import { DetailModal } from "../components/DetailModal";
import { EditSidebar } from "../components/EditSidebar";
import type { Individual, Family } from "../utils/gedcomProcessor";

// Controls panel component inside the zoom-pan wrapper to access controls hook
const CanvasControls: React.FC = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute left-6 bottom-6 z-30 flex gap-2 bg-surface-lowest/80 backdrop-blur-md border border-outline-variant p-2 rounded-2xl shadow-lg">
      <button
        onClick={() => zoomIn()}
        className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-low rounded-xl transition-all active:scale-95"
        title="Zoom In"
      >
        <ZoomIn size={18} />
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-low rounded-xl transition-all active:scale-95"
        title="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>
      <button
        onClick={() => resetTransform()}
        className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-low rounded-xl transition-all active:scale-95"
        title="Reset Viewport"
      >
        <Maximize2 size={18} />
      </button>
    </div>
  );
};

export const TreeVisualizerView: React.FC = () => {
  const {
    individuals,
    families,
    selectedNodeId,
    selectNode,
    addIndividual,
    addFamily,
    updateFamily
  } = useFamily();

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Compute Layout
  const { nodes, lines } = useMemo(() => {
    return computeTreeLayout(individuals, families);
  }, [individuals, families]);

  // Canvas bounds sizing
  const canvasSize = useMemo(() => {
    if (nodes.length === 0) return { w: 2000, h: 1000 };
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - 400;
    const maxX = Math.max(...xs) + 400;
    const minY = Math.min(...ys) - 200;
    const maxY = Math.max(...ys) + 400;

    return {
      w: Math.max(2400, maxX - minX),
      h: Math.max(1200, maxY - minY)
    };
  }, [nodes]);

  const midX = canvasSize.w / 2;

  // ID generators
  // We disable purity rules here because Date.now() and Math.random() are used in the generator
  // eslint-disable-next-line react-hooks/purity
  const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}@`;

  // Add Spouse floating tool
  const handleAddSpouse = (indiId: string) => {
    const indi = individuals[indiId];
    if (!indi) return;

    const newSpouseId = generateId('@I_SP');
    const newSpouse: Individual = {
      id: newSpouseId,
      firstName: "New",
      lastName: indi.lastName || "Spouse",
      gender: indi.gender === "M" ? "F" : "M",
      birthDate: "",
      birthPlace: "",
      deathDate: "",
      deathPlace: "",
      biography: "",
      story: "",
      profileUrl: "",
      tags: [],
      recordings: []
    };

    const newFamId = generateId('@F_UN');
    const newFam: Family = {
      id: newFamId,
      husbandId: indi.gender === "M" ? indi.id : newSpouseId,
      wifeId: indi.gender === "F" ? indi.id : newSpouseId,
      children: [],
      marriageDate: "",
      marriagePlace: ""
    };

    addIndividual(newSpouse);
    addFamily(newFam);
    selectNode(newFamId);
    setShowSidebar(true);
  };

  // Add Child floating tool
  const handleAddChild = (famId: string) => {
    const fam = families[famId];
    if (!fam) return;

    const childLastName = (fam.husbandId && individuals[fam.husbandId]?.lastName) || "";
    const newChildId = generateId('@I_CH');
    const newChild: Individual = {
      id: newChildId,
      firstName: "New Child",
      lastName: childLastName,
      gender: "U",
      birthDate: "",
      birthPlace: "",
      deathDate: "",
      deathPlace: "",
      biography: "",
      story: "",
      profileUrl: "",
      tags: [],
      recordings: []
    };

    addIndividual(newChild);
    
    // Add child ID to the parent family children list
    const updatedChildren = [...fam.children, newChildId];
    updateFamily(fam.id, { children: updatedChildren });
    selectNode(newChildId);
    setShowSidebar(true);
  };

  const handleCardClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  const handleCardDoubleClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
    setShowDetailModal(true);
  };

  const renderProfileImage = (indi: Individual) => {
    if (indi.profileUrl) {
      return (
        <img
          src={indi.profileUrl}
          alt={indi.firstName}
          className="w-10 h-10 rounded-xl object-cover border border-outline-variant/30"
        />
      );
    }
    const initials = `${indi.firstName[0] || ""}${indi.lastName[0] || ""}`;
    const colorClass = indi.gender === "M" ? "bg-blue-100 text-blue-800" : indi.gender === "F" ? "bg-pink-100 text-pink-800" : "bg-surface-high text-on-surface-variant";
    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border border-outline-variant/30 ${colorClass}`}>
        {initials || "?"}
      </div>
    );
  };

  return (
    <div className="relative w-full h-[calc(100vh-73px)] overflow-hidden flex bg-[#121319]">
      {/* Dark Glowing Canvas Grid Background */}
      <div className="absolute inset-0 pointer-events-none canvas-grid-pattern-dark opacity-40 z-0"></div>

      <div className="flex-1 h-full z-10">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 relative z-20">
            <div className="bg-surface-low/10 p-6 rounded-3xl border border-outline-variant/20 max-w-md shadow-2xl backdrop-blur-md">
              <img src="/logo_emblem.png" alt="Fico e Famiglia Logo" className="w-16 h-16 mx-auto mb-4 object-contain rounded-xl" />
              <h3 className="text-xl font-bold text-white mb-2">No Family Tree Data</h3>
              <p className="text-xs text-on-surface-variant/80 leading-relaxed mb-6">
                Your family tree is empty. Import a standard GEDCOM file using the upload button in the header, or click below to populate the sample tree.
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem("kinship_flow_data");
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold rounded-xl active:scale-95 transition-all shadow-lg"
              >
                Load Sample Oliveri Tree
              </button>
            </div>
          </div>
        ) : (
          <TransformWrapper
            initialScale={0.8}
            initialPositionX={window.innerWidth / 2 - midX * 0.8}
            initialPositionY={100}
            minScale={0.2}
            maxScale={2}
            limitToBounds={false}
          >
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="relative select-none">
              <div style={{ width: canvasSize.w, height: canvasSize.h }} className="relative">
                {/* SVG connection lines overlay */}
                <svg
                  width={canvasSize.w}
                  height={canvasSize.h}
                  className="absolute inset-0 pointer-events-none z-10"
                >
                  {lines.map((line) => {
                    // Translate X coordinates inside SVG path points
                    const pathStr = line.path.replace(/(^[M]\s*|C\s*|,\s*)(-?\d+(\.\d+)?)/gi, (_, prefix, numStr) => {
                      const num = parseFloat(numStr);
                      return prefix + (num + midX).toString();
                    });

                    return (
                      <path
                        key={line.id}
                        d={pathStr}
                        fill="none"
                        stroke="rgba(45, 90, 39, 0.45)"
                        strokeWidth="2"
                        className="transition-all duration-300 drop-shadow-[0_0_2px_rgba(45,90,39,0.3)]"
                      />
                    );
                  })}
                </svg>

                {/* Dynamic Nodes Container */}
                <div
                  style={{ width: canvasSize.w, height: canvasSize.h }}
                  className="absolute inset-0 pointer-events-none z-20"
                >
                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.id;
                    const leftCoord = midX + node.x - node.width / 2;
                    const topCoord = node.y;

                    if (node.type === "union") {
                      const fam = families[node.id];
                      const husb = fam?.husbandId ? individuals[fam.husbandId] : null;
                      const wife = fam?.wifeId ? individuals[fam.wifeId] : null;

                      return (
                        <div
                          key={node.id}
                          onClick={(e) => handleCardClick(node.id, e)}
                          onDoubleClick={(e) => handleCardDoubleClick(node.id, e)}
                          style={{
                            left: `${leftCoord}px`,
                            top: `${topCoord}px`,
                            width: `${node.width}px`
                          }}
                          className={`absolute -translate-y-1/2 p-3 bg-[#16181f]/80 backdrop-blur-xl border pointer-events-auto rounded-3xl cursor-pointer flex flex-col justify-between h-[130px] transition-all duration-300 ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30 shadow-[0_0_25px_rgba(45,90,39,0.45)] scale-[1.03]"
                              : "border-outline-variant/15 hover:border-primary/50 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
                          }`}
                        >
                          {/* Two columns for spouses */}
                          <div className="flex divide-x divide-outline-variant/10 flex-1">
                            {/* Husband Column */}
                            <div className="flex-1 pr-2 flex items-center gap-2.5 overflow-hidden">
                              {husb && renderProfileImage(husb)}
                              <div className="overflow-hidden">
                                <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest block">
                                  Husband
                                </span>
                                <span className="text-[11px] font-black text-white truncate block">
                                  {husb ? husb.firstName : "Unknown"}
                                </span>
                                <span className="text-[9px] font-bold text-primary/70 block mt-0.5">
                                  {husb?.birthDate ? husb.birthDate.split(" ").pop() : "????"} - {husb?.deathDate ? (husb.deathDate.toUpperCase() === "PRESENT" ? "Pres" : husb.deathDate.split(" ").pop()) : "????"}
                                </span>
                              </div>
                            </div>

                            {/* Wife Column */}
                            <div className="flex-1 pl-3 flex items-center gap-2.5 overflow-hidden">
                              {wife && renderProfileImage(wife)}
                              <div className="overflow-hidden">
                                <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest block">
                                  Wife
                                </span>
                                <span className="text-[11px] font-black text-white truncate block">
                                  {wife ? wife.firstName : "Unknown"}
                                </span>
                                <span className="text-[9px] font-bold text-primary/70 block mt-0.5">
                                  {wife?.birthDate ? wife.birthDate.split(" ").pop() : "????"} - {wife?.deathDate ? (wife.deathDate.toUpperCase() === "PRESENT" ? "Pres" : wife.deathDate.split(" ").pop()) : "????"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Interactive connectors & mini toolbar */}
                          <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10 text-[9px] font-bold text-on-surface-variant/50">
                            <span className="flex items-center gap-1">
                              <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" />
                              {fam.marriageDate ? fam.marriageDate.split(" ").pop() : "Union"}
                            </span>
                            
                            {/* Hover action toolbar */}
                            <div className="flex gap-1.5 opacity-0 hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddChild(node.id);
                                }}
                                title="Add Child"
                                className="p-1 hover:text-primary hover:bg-surface-low/10 rounded"
                              >
                                <UserPlus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Single node (never married / children)
                      const indi = individuals[node.id];
                      if (!indi) return null;

                      return (
                        <div
                          key={node.id}
                          onClick={(e) => handleCardClick(node.id, e)}
                          onDoubleClick={(e) => handleCardDoubleClick(node.id, e)}
                          style={{
                            left: `${leftCoord}px`,
                            top: `${topCoord}px`,
                            width: `${node.width}px`
                          }}
                          className={`absolute -translate-y-1/2 p-2.5 bg-[#16181f]/80 backdrop-blur-xl border pointer-events-auto rounded-2xl cursor-pointer flex flex-col justify-between h-[90px] transition-all duration-300 ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30 shadow-[0_0_25px_rgba(45,90,39,0.45)] scale-[1.03]"
                              : "border-outline-variant/15 hover:border-primary/50 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
                            {renderProfileImage(indi)}
                            <div className="overflow-hidden">
                              <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest block">
                                Relative
                              </span>
                              <span className="text-[11px] font-black text-white truncate block">
                                {indi.firstName} {indi.lastName}
                              </span>
                              <span className="text-[9px] font-bold text-primary/70 block mt-0.5">
                                {indi.birthDate ? indi.birthDate.split(" ").pop() : "????"} - {indi.deathDate ? (indi.deathDate.toUpperCase() === "PRESENT" ? "Pres" : indi.deathDate.split(" ").pop()) : "????"}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[8px] font-bold text-on-surface-variant/40 pt-1">
                            <span className="uppercase tracking-wider">
                              {indi.gender === "M" ? "Male" : indi.gender === "F" ? "Female" : "Other"}
                            </span>
                            
                            <div className="flex gap-1.5 opacity-0 hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddSpouse(node.id);
                                }}
                                title="Add Spouse"
                                className="p-0.5 hover:text-primary hover:bg-surface-low/10 rounded"
                              >
                                <UserPlus size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </TransformComponent>
            <CanvasControls />
          </TransformWrapper>
        )}
      </div>

      {/* Detail overlay toggle */}
      {selectedNodeId && !showSidebar && (
        <div className="absolute right-6 top-6 z-30 bg-surface-lowest/90 backdrop-blur-md border border-outline-variant p-4 rounded-2xl shadow-2xl max-w-[280px] animate-slide-in">
          <div className="flex justify-between items-start gap-3">
            <div>
              <span className="text-[8px] font-black text-primary uppercase tracking-widest block">
                Selected Item
              </span>
              <h4 className="font-bold text-sm text-on-surface leading-tight mt-0.5 truncate max-w-[190px]">
                {selectedNodeId.startsWith("@F")
                  ? (() => {
                      const fam = families[selectedNodeId];
                      const husb = fam?.husbandId ? individuals[fam.husbandId]?.firstName : "";
                      const wife = fam?.wifeId ? individuals[fam.wifeId]?.firstName : "";
                      return husb && wife ? `${husb} & ${wife}` : "Union";
                    })()
                  : `${individuals[selectedNodeId]?.firstName} ${individuals[selectedNodeId]?.lastName}`}
              </h4>
            </div>
            <button
              onClick={() => selectNode(null)}
              className="text-on-surface-variant/50 hover:text-on-surface p-0.5 rounded-full"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowDetailModal(true)}
              className="flex-1 py-1.5 bg-surface-low hover:bg-surface-high border border-outline-variant text-[10px] font-bold text-on-surface-variant hover:text-primary rounded-lg transition-all"
            >
              View Story
            </button>
            <button
              onClick={() => setShowSidebar(true)}
              className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-[10px] font-bold text-on-primary rounded-lg transition-all"
            >
              Edit Node
            </button>
          </div>
        </div>
      )}

      {/* Add detail modal */}
      <DetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={(nodeId) => {
          selectNode(nodeId);
          setShowSidebar(true);
        }}
      />

      {/* Sidebar Editor */}
      <EditSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
    </div>
  );
};
