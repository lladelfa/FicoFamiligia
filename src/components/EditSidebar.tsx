import React, { useState } from "react";
import { useFamily } from "../context/FamilyContext";
import { X, Trash2, Calendar, Code, Heart, Upload } from "lucide-react";
import type { Individual, Family } from "../utils/gedcomProcessor";
import { DateInput } from "./DateInput";

interface EditSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditSidebar: React.FC<EditSidebarProps> = ({ isOpen, onClose }) => {
  const {
    selectedNodeId,
    individuals,
    families,
    updateIndividual,
    updateFamily,
    deleteIndividual
  } = useFamily();
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  if (!isOpen || !selectedNodeId) return null;

  const isFamilyNode = selectedNodeId.startsWith("@F");
  let targetIndis: Individual[] = [];
  let familyUnion: Family | null = null;

  if (isFamilyNode) {
    familyUnion = families[selectedNodeId] || null;
    if (familyUnion) {
      if (familyUnion.husbandId && individuals[familyUnion.husbandId]) {
        targetIndis.push(individuals[familyUnion.husbandId]);
      }
      if (familyUnion.wifeId && individuals[familyUnion.wifeId]) {
        targetIndis.push(individuals[familyUnion.wifeId]);
      }
    }
  } else {
    const indi = individuals[selectedNodeId];
    if (indi) {
      targetIndis.push(indi);
    }
  }

  const handleFieldChange = (indiId: string, field: keyof Individual, value: any) => {
    updateIndividual(indiId, { [field]: value });
  };

  const handleTagsChange = (indiId: string, tagsStr: string) => {
    const tagsArr = tagsStr.split(",").map(t => t.trim()).filter(Boolean);
    updateIndividual(indiId, { tags: tagsArr });
  };

  const handleUnionFieldChange = (field: keyof Family, value: any) => {
    if (familyUnion) {
      updateFamily(familyUnion.id, { [field]: value });
    }
  };

  const handleDeleteIndi = (id: string) => {
    if (confirm("Are you sure you want to delete this family member? All their data will be permanently removed.")) {
      deleteIndividual(id);
      onClose();
    }
  };

  const renderIndividualForm = (indi: Individual, roleTitle?: string) => {
    return (
      <div key={indi.id} className="space-y-4">
        {roleTitle && (
          <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.15em] flex items-center gap-1">
              👤 {roleTitle}
            </span>
            <button
              onClick={() => handleDeleteIndi(indi.id)}
              className="text-on-error hover:text-red-700 p-1 hover:bg-red-50 rounded transition-all"
              title="Delete Relative"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        
        {/* Names */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1">
              First Name
            </label>
            <input
              type="text"
              value={indi.firstName}
              onChange={(e) => handleFieldChange(indi.id, "firstName", e.target.value)}
              className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1.5 focus:border-primary focus:ring-0 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={indi.lastName}
              onChange={(e) => handleFieldChange(indi.id, "lastName", e.target.value)}
              className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1.5 focus:border-primary focus:ring-0 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Gender & Profile URL */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1">
              Gender
            </label>
            <select
              value={indi.gender}
              onChange={(e) => handleFieldChange(indi.id, "gender", e.target.value)}
              className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2 py-1.5 focus:border-primary focus:ring-0 focus:outline-none transition-all"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="U">Other</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1">
              Photo Source
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={indi.profileUrl.startsWith("data:") ? "Local Photo Uploaded" : indi.profileUrl}
                onChange={(e) => handleFieldChange(indi.id, "profileUrl", e.target.value)}
                placeholder="https://... or upload"
                disabled={indi.profileUrl.startsWith("data:")}
                className="flex-1 min-w-0 text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1.5 focus:border-primary focus:ring-0 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <input
                type="file"
                id={`file-upload-${indi.id}`}
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    if (result) {
                      handleFieldChange(indi.id, "profileUrl", result);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
              {indi.profileUrl.startsWith("data:") ? (
                <button
                  type="button"
                  onClick={() => handleFieldChange(indi.id, "profileUrl", "")}
                  className="px-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold transition-all active:scale-95 flex items-center justify-center whitespace-nowrap"
                  title="Remove Uploaded Photo"
                >
                  Clear
                </button>
              ) : (
                <label
                  htmlFor={`file-upload-${indi.id}`}
                  className="px-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95 flex items-center justify-center whitespace-nowrap gap-1"
                  title="Upload Photo Scan"
                >
                  <Upload size={11} />
                  Upload
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Birth Details */}
        <div className="bg-surface-low/30 border border-outline-variant/30 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-primary text-[9px] font-bold uppercase tracking-wider">
            <Calendar size={11} />
            Birth Event
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="Birth Date"
              value={indi.birthDate}
              onChange={(val) => handleFieldChange(indi.id, "birthDate", val)}
            />
            <div>
              <label className="text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                Birth Place
              </label>
              <input
                type="text"
                value={indi.birthPlace}
                onChange={(e) => handleFieldChange(indi.id, "birthPlace", e.target.value)}
                placeholder="Location"
                className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1 focus:border-primary focus:ring-0 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Death Details */}
        <div className="bg-surface-low/30 border border-outline-variant/30 rounded-xl p-3 space-y-3">
          <div className="flex justify-between items-center text-primary text-[9px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Calendar size={11} />
              Death Event
            </span>
            <label className="flex items-center gap-1 cursor-pointer normal-case text-on-surface-variant/80 font-normal">
              <input
                type="checkbox"
                checked={indi.deathDate.toUpperCase() === "PRESENT"}
                onChange={(e) => handleFieldChange(indi.id, "deathDate", e.target.checked ? "PRESENT" : "")}
                className="rounded border-outline-variant text-primary focus:ring-0 w-3 h-3"
              />
              Living
            </label>
          </div>
          {indi.deathDate.toUpperCase() !== "PRESENT" && (
            <div className="grid grid-cols-2 gap-3">
              <DateInput
                label="Death Date"
                value={indi.deathDate === "PRESENT" ? "" : indi.deathDate}
                onChange={(val) => handleFieldChange(indi.id, "deathDate", val)}
              />
              <div>
                <label className="text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                  Death Place
                </label>
                <input
                  type="text"
                  value={indi.deathPlace}
                  onChange={(e) => handleFieldChange(indi.id, "deathPlace", e.target.value)}
                  placeholder="Location"
                  className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1 focus:border-primary focus:ring-0 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={indi.tags?.join(", ") || ""}
            onChange={(e) => handleTagsChange(indi.id, e.target.value)}
            placeholder="E.g., PIONEER, IMMIGRANT"
            className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1.5 focus:border-primary focus:ring-0 focus:outline-none transition-all"
          />
        </div>

        {/* Biography */}
        <div>
          <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1">
            Biography Notes
          </label>
          <textarea
            value={indi.biography}
            onChange={(e) => handleFieldChange(indi.id, "biography", e.target.value)}
            placeholder="Short notes or summary..."
            className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1.5 focus:border-primary focus:ring-0 focus:outline-none h-20 resize-none transition-all"
          />
        </div>
      </div>
    );
  };

  return (
    <aside className="w-full sm:w-[384px] fixed right-0 top-[73px] h-[calc(100vh-73px)] border-l border-outline-variant/30 bg-surface-lowest/90 backdrop-blur-xl flex flex-col z-35 animate-slide-in shadow-2xl overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-outline-variant/30 bg-surface-low/30">
        <div>
          <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
            📝 Edit Details
          </h3>
          <p className="text-[10px] text-on-surface-variant/60 font-semibold uppercase tracking-wider mt-0.5">
            {isFamilyNode ? "Union Record Editor" : "Individual Record Editor"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-on-surface-variant/50 hover:text-on-surface bg-surface-low rounded-full transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {targetIndis.length === 0 ? (
          <div className="text-center text-on-surface-variant py-8 space-y-3">
            <p className="text-xs">No active individual selected.</p>
            {!isFamilyNode && (
              <button
                onClick={() => handleDeleteIndi(selectedNodeId)}
                className="px-3 py-1.5 bg-red-50 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 hover:bg-red-100 flex items-center gap-1.5 mx-auto transition-all"
              >
                <Trash2 size={12} />
                Delete Node
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Couple Double Form Grid */}
            {isFamilyNode && targetIndis.length === 2 ? (
              <div className="space-y-6">
                {/* Spouse A (Husband) */}
                {renderIndividualForm(targetIndis[0], "Husband Details")}
                
                {/* Spouse B (Wife) */}
                {renderIndividualForm(targetIndis[1], "Wife Details")}

                {/* Union-level Info (Marriage Event) */}
                {familyUnion && (
                  <div className="bg-surface-low/50 border border-outline-variant/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-primary text-[10px] font-black uppercase tracking-wider">
                      <Heart size={12} className="text-red-500 fill-red-500" />
                      Marriage Union Event
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <DateInput
                        label="Marriage Date"
                        value={familyUnion.marriageDate}
                        onChange={(val) => handleUnionFieldChange("marriageDate", val)}
                      />
                      <div>
                        <label className="text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                          Marriage Place
                        </label>
                        <input
                          type="text"
                          value={familyUnion.marriagePlace}
                          onChange={(e) => handleUnionFieldChange("marriagePlace", e.target.value)}
                          placeholder="Location"
                          className="w-full text-xs bg-surface-low border border-outline-variant rounded-lg px-2.5 py-1 focus:border-primary focus:ring-0 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Single form (one person)
              renderIndividualForm(targetIndis[0])
            )}

            {/* Advanced inspector drawer */}
            <div className="border-t border-outline-variant/30 pt-4 mt-6">
              <button
                onClick={() => setShowJsonInspector(!showJsonInspector)}
                className="w-full flex justify-between items-center text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider hover:text-primary transition-colors py-1"
              >
                <span className="flex items-center gap-1">
                  <Code size={11} />
                  Advanced JSON Record Inspector
                </span>
                <span>{showJsonInspector ? "Hide" : "Show"}</span>
              </button>
              {showJsonInspector && (
                <pre className="mt-3 bg-surface-low rounded-xl p-3 border border-outline-variant text-[10px] font-mono text-on-surface overflow-x-auto max-h-48 custom-scrollbar">
                  {JSON.stringify(
                    isFamilyNode 
                      ? { family: familyUnion, spouses: targetIndis } 
                      : targetIndis[0], 
                    null, 
                    2
                  )}
                </pre>
              )}
            </div>
          </>
        )}
      </div>

      {/* Save indicator / done footer */}
      <div className="px-5 py-4 border-t border-outline-variant/30 bg-surface-low/30 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
            Changes Saved Live
          </span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold rounded-xl active:scale-95 transition-transform"
        >
          Done
        </button>
      </div>
    </aside>
  );
};
