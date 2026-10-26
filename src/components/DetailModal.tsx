import React from "react";
import { useFamily } from "../context/FamilyContext";
import { X, Calendar, MapPin, Edit, BookOpen } from "lucide-react";
import type { Individual } from "../utils/gedcomProcessor";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (nodeId: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, onEdit }) => {
  const { selectedNodeId, individuals, families } = useFamily();

  if (!isOpen || !selectedNodeId) return null;

  // Retrieve selected individuals based on selectedNodeId
  let targetIndis: Individual[] = [];
  let title = "Family Record";

  if (selectedNodeId.startsWith("@F")) {
    // Family Node (Couple)
    const fam = families[selectedNodeId];
    if (fam) {
      if (fam.husbandId && individuals[fam.husbandId]) {
        targetIndis.push(individuals[fam.husbandId]);
      }
      if (fam.wifeId && individuals[fam.wifeId]) {
        targetIndis.push(individuals[fam.wifeId]);
      }
      title = "Union Record";
    }
  } else {
    // Individual Node (Single)
    const indi = individuals[selectedNodeId];
    if (indi) {
      targetIndis.push(indi);
      title = "Individual Record";
    }
  }

  const renderProfileImage = (indi: Individual) => {
    if (indi.profileUrl) {
      return (
        <img
          src={indi.profileUrl}
          alt={`${indi.firstName} ${indi.lastName}`}
          className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md"
        />
      );
    }

    const initials = `${indi.firstName[0] || ""}${indi.lastName[0] || ""}`;
    const bgColor = indi.gender === "M" ? "bg-[#e2e7f3] text-[#3b5998]" : indi.gender === "F" ? "bg-[#fbe7ec] text-[#e03a70]" : "bg-surface-high text-on-surface-variant";
    return (
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-lg border-2 border-outline-variant/30 shadow-sm ${bgColor}`}>
        {initials || "?"}
      </div>
    );
  };

  const formatLifespan = (indi: Individual) => {
    const birth = indi.birthDate ? indi.birthDate.split(" ").pop() : "????";
    const death = indi.deathDate ? (indi.deathDate.toUpperCase() === "PRESENT" ? "Present" : indi.deathDate.split(" ").pop()) : "????";
    return `${birth} — ${death}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="bg-surface-lowest/90 backdrop-blur-xl border border-outline-variant w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center px-6 md:px-8 py-5 border-b border-outline-variant/30 bg-surface-low/30">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onEdit(selectedNodeId);
                onClose();
              }}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Edit size={14} />
              Edit Record
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-on-surface-variant/50 hover:text-on-surface bg-surface-low rounded-full transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          {targetIndis.length === 0 ? (
            <p className="text-center text-on-surface-variant py-8">No individual details found.</p>
          ) : (
            <div className={`grid gap-8 ${targetIndis.length > 1 ? "md:grid-cols-2 md:divide-x md:divide-outline-variant/35" : "max-w-2xl mx-auto"}`}>
              {targetIndis.map((indi, idx) => (
                <div key={indi.id} className={`${targetIndis.length > 1 && idx === 1 ? "md:pl-8" : ""}`}>
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-4 mb-6">
                    {renderProfileImage(indi)}
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                        {indi.gender === "M" ? "Husband" : indi.gender === "F" ? "Wife" : "Individual"}
                      </span>
                      <h2 className="text-xl md:text-2xl font-black text-on-surface leading-tight mt-0.5">
                        {indi.firstName} {indi.lastName}
                      </h2>
                      <p className="text-xs font-semibold text-primary/80 mt-1 flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatLifespan(indi)}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  {indi.tags && indi.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {indi.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded uppercase tracking-wider border border-on-secondary-container/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-5 text-sm">
                    {/* Birth / Death Metadata */}
                    <div className="grid grid-cols-2 gap-4 bg-surface-low/30 rounded-2xl p-4 border border-outline-variant/20">
                      <div>
                        <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block">Born</span>
                        <span className="font-semibold text-xs text-on-surface block mt-0.5">{indi.birthDate || "Unknown"}</span>
                        {indi.birthPlace && (
                          <span className="text-[11px] text-on-surface-variant/80 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} className="shrink-0" />
                            {indi.birthPlace}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block">Died</span>
                        <span className="font-semibold text-xs text-on-surface block mt-0.5">
                          {indi.deathDate ? (indi.deathDate.toUpperCase() === "PRESENT" ? "Living" : indi.deathDate) : "Unknown"}
                        </span>
                        {indi.deathPlace && (
                          <span className="text-[11px] text-on-surface-variant/80 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} className="shrink-0" />
                            {indi.deathPlace}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Biography Note */}
                    {indi.biography && (
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mb-1">
                          Brief Biography
                        </span>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {indi.biography}
                        </p>
                      </div>
                    )}

                    {/* Oral History / Long Story */}
                    {indi.story && (
                      <div className="border-t border-outline-variant/30 pt-4">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-2">
                          <BookOpen size={12} />
                          Preserved Story
                        </span>
                        <div className="max-h-60 overflow-y-auto pr-2 text-xs text-on-surface leading-relaxed whitespace-pre-line custom-scrollbar font-serif italic text-on-surface-variant">
                          "{indi.story}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
