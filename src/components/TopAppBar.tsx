import React, { useState, useRef } from "react";
import { useFamily } from "../context/FamilyContext";
import { Upload, Download, Key, X, Check } from "lucide-react";

export const TopAppBar: React.FC = () => {
  const { activeView, setActiveView, importGedcom, exportGedcom, geminiApiKey, setGeminiApiKey } = useFamily();
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(geminiApiKey);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        importGedcom(text);
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const gedcomStr = exportGedcom();
    const blob = new Blob([gedcomStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "family_tree.ged";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveKey = () => {
    setGeminiApiKey(tempKey);
    setShowKeyModal(false);
  };

  return (
    <>
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-6 md:px-12 py-4 bg-surface-lowest/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 select-none">
            <img src="/logo_emblem.png" alt="Fico e Famiglia Logo" className="w-8 h-8 object-contain rounded-lg border border-outline-variant/20" />
            <div className="flex flex-col">
              <span className="font-epilogue text-base md:text-lg font-black text-primary leading-none tracking-tight">
                Fico e Famiglia
              </span>
              <span className="text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mt-0.5 leading-none">
                Digital Heritage Visualization
              </span>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 items-center ml-4">
            <button
              onClick={() => setActiveView("tree")}
              className={`text-sm font-semibold tracking-wide transition-all pb-1 border-b-2 ${
                activeView === "tree"
                  ? "text-primary border-primary font-bold"
                  : "text-on-surface-variant/70 border-transparent hover:text-primary"
              }`}
            >
              My Tree
            </button>
            <button
              onClick={() => setActiveView("stories")}
              className={`text-sm font-semibold tracking-wide transition-all pb-1 border-b-2 ${
                activeView === "stories"
                  ? "text-primary border-primary font-bold"
                  : "text-on-surface-variant/70 border-transparent hover:text-primary"
              }`}
            >
              Story Hub
            </button>
            <button
              onClick={() => setActiveView("archive")}
              className={`text-sm font-semibold tracking-wide transition-all pb-1 border-b-2 ${
                activeView === "archive"
                  ? "text-primary border-primary font-bold"
                  : "text-on-surface-variant/70 border-transparent hover:text-primary"
              }`}
            >
              Archive
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Action buttons */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".ged"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            title="Import GEDCOM"
            className="p-2 text-on-surface-variant/80 hover:text-primary hover:bg-surface-low rounded-full transition-all active:scale-95"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={handleExport}
            title="Export GEDCOM"
            className="p-2 text-on-surface-variant/80 hover:text-primary hover:bg-surface-low rounded-full transition-all active:scale-95"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => {
              setTempKey(geminiApiKey);
              setShowKeyModal(true);
            }}
            title="Gemini API Key"
            className={`p-2 rounded-full transition-all active:scale-95 ${
              geminiApiKey 
                ? "text-primary bg-primary/10 hover:bg-primary/20" 
                : "text-on-surface-variant/80 hover:text-primary hover:bg-surface-low"
            }`}
          >
            <Key size={18} />
          </button>
          
          <div className="w-[1px] h-6 bg-outline-variant/30 hidden md:block mx-1"></div>
          
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 ml-1">
            <img
              alt="User profile"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMGP1akgrtT2_uhZC0coxoWF-2ElVsHyO6MbTjFUDwngMcJI_Nz8TX58VGCfodUNyjhtxP7yEogmCpEqD-BfWXdj2_LXyR6N6bRuU1T8IIGM4jNEot6SrjbLaNxPko7YXrPuEe3MOclzRNvAGMEjI3gBPPmOdB1pNeM13tu-02Ic3rsNbwziEVk03RPu7Nh6DA2D6eic8M4MNdh0y4nt6jPsP6VW4anWto4uYMFYROXNHNsUuqt99uJTEI39JsdQsA_5xnztkMjKVa"
            />
          </div>
        </div>
      </header>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
          <div className="bg-surface-lowest max-w-md w-full rounded-2xl border border-outline-variant p-6 shadow-2xl animate-slide-in">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Key size={18} />
                  Gemini API Configuration
                </h3>
                <p className="text-xs text-on-surface-variant/80 mt-1">
                  Provide an API key to enable live voice storytelling polishes using Gemini models.
                </p>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 text-on-surface-variant/50 hover:text-on-surface rounded-full transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full text-sm bg-surface-low border border-outline-variant rounded-xl px-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                />
              </div>
              
              <div className="bg-surface-low/50 rounded-xl p-3 border border-outline-variant/30 text-[11px] leading-relaxed text-on-surface-variant">
                Your API key is saved locally in your browser's <code className="bg-surface-high px-1 py-0.5 rounded text-primary">localStorage</code> and is sent directly to Google Gemini APIs. It is never stored on external servers.
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-low transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-primary-hover transition-all"
              >
                <Check size={14} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
