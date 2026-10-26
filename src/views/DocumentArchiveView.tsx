import React, { useState, useRef, useMemo } from "react";
import { useFamily } from "../context/FamilyContext";
import { Plus, Search, Trash2, ShieldCheck, Upload, Calendar, X, AlertCircle } from "lucide-react";
import type { ArchiveDocument } from "../utils/gedcomProcessor";
import { processImageFile } from "../utils/imageProcessor";

export const DocumentArchiveView: React.FC = () => {
  const { documents, addDocument, deleteDocument } = useFamily();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);

  // Uploader modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [docCategory, setDocCategory] = useState<"Photos" | "Documents" | "Letters">("Photos");
  const [docTags, setDocTags] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docFileUrl, setDocFileUrl] = useState<string | null>(null);
  const [linkedIndividuals, setLinkedIndividuals] = useState<string[]>([]);
  const { individuals } = useFamily();

  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Category list
  const categories = ["All", "Photos", "Documents", "Letters"];
  // Decades
  const decades = ["1900s", "1920s", "1950s", "1980s"];

  // Filter logic
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = selectedCategory === "All" || doc.category === selectedCategory;

      let matchDecade = true;
      if (selectedDecade) {
        const year = parseInt(doc.date.match(/\d{4}/)?.[0] || "", 10);
        if (isNaN(year)) {
          matchDecade = false;
        } else {
          const decadeStart = parseInt(selectedDecade.substring(0, 4), 10);
          matchDecade = year >= decadeStart && year < decadeStart + 10;
        }
      }

      return matchSearch && matchCategory && matchDecade;
    });
  }, [documents, searchQuery, selectedCategory, selectedDecade]);

  // Vault Storage calculations (base64 length + 1.2MB placeholder files)
  const storageUsage = useMemo(() => {
    const totalBytes = documents.reduce((acc, doc) => {
      if (doc.url.startsWith("data:")) {
        return acc + doc.url.length * 0.75; // Convert base64 length to byte size
      }
      return acc + 1200000; // Mock 1.2MB for public CDN links
    }, 0);

    const mb = totalBytes / (1024 * 1024);
    const limit = 50; // 50MB local storage limit
    const percent = Math.min(100, (mb / limit) * 100);

    return {
      mb: mb.toFixed(1),
      limit,
      percent: percent.toFixed(0)
    };
  }, [documents]);

  const handleDepositClick = () => {
    setShowUploadModal(true);
    setDocTitle("");
    setDocDate("");
    setDocCategory("Photos");
    setDocTags("");
    setDocDescription("");
    setDocFileUrl(null);
    setLinkedIndividuals([]);
  };

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await processImageFile(file, 1200, 0.8);
      setDocFileUrl(base64);
      // Pre-fill title if empty
      if (!docTitle) {
        const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        setDocTitle(cleanName);
      }
    } catch (err) {
      console.error("Failed to process document image:", err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFileUrl) {
      alert("Please select a photo or document file to deposit.");
      return;
    }

    const newDoc: ArchiveDocument = {
      id: `doc-${Date.now()}`,
      title: docTitle || "Untitled Record",
      date: docDate || "Undated",
      category: docCategory,
      tags: docTags.split(",").map(t => t.trim()).filter(Boolean),
      individualIds: linkedIndividuals,
      url: docFileUrl,
      description: docDescription,
      verified: true,
      contributor: "You (Marco O.)"
    };

    addDocument(newDoc);
    setShowUploadModal(false);
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to permanently delete "${title}" from the digital vault?`)) {
      deleteDocument(id);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex bg-background">
      {/* Sidebar Filter */}
      <aside className="w-[300px] bg-surface-low/30 border-r border-outline-variant/30 flex flex-col p-6 hidden md:flex shrink-0">
        {/* Search */}
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-surface-lowest border border-outline-variant rounded-xl pl-9 pr-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
        </div>

        {/* Collections */}
        <div className="mb-8">
          <h3 className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">
            Collections
          </h3>
          <nav className="space-y-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full flex items-center justify-between px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-low"
                }`}
              >
                <span>{cat === "All" ? "All Records" : cat}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedCategory === cat ? "bg-primary-hover text-on-primary" : "bg-surface-high text-on-surface-variant/70"}`}>
                  {cat === "All" 
                    ? documents.length 
                    : documents.filter(d => d.category === cat).length
                  }
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Decades Timeline */}
        <div className="mb-8">
          <h3 className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] mb-4">
            Timeline Decades
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {decades.map(decade => (
              <button
                key={decade}
                onClick={() => setSelectedDecade(selectedDecade === decade ? null : decade)}
                className={`px-3 py-2 border text-[11px] font-semibold rounded-xl text-center transition-all ${
                  selectedDecade === decade
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-outline-variant/30 bg-surface-lowest text-on-surface-variant hover:border-primary/50"
                }`}
              >
                {decade}
              </button>
            ))}
          </div>
        </div>

        {/* Local Storage Vault Meter */}
        <div className="mt-auto">
          <div className="p-4 rounded-2xl bg-secondary-container/20 border border-secondary-container/50 space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black text-primary uppercase tracking-wider">
              <span>Vault Storage</span>
              <span className="normal-case font-normal text-on-surface-variant">{storageUsage.percent}% filled</span>
            </div>
            
            <div className="w-full bg-surface-high rounded-full h-1.5 overflow-hidden">
              <div
                style={{ width: `${storageUsage.percent}%` }}
                className="bg-primary h-full rounded-full transition-all duration-500"
              ></div>
            </div>

            <p className="text-[10px] text-on-surface-variant/80 leading-relaxed font-semibold">
              {storageUsage.mb} MB of {storageUsage.limit} MB secured in browser cache
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-primary">
              Digital Preservation Vault
            </h1>
            <p className="text-xs text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
              Curate family certificates, letters, and vintage scans. Safe-kept locally in your browser gallery.
            </p>
          </div>
          <button
            onClick={handleDepositClick}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 shadow-md shrink-0 transition-all"
          >
            <Plus size={14} />
            Deposit Record
          </button>
        </div>

        {/* Bento Grid layout */}
        {filteredDocs.length === 0 ? (
          <div className="text-center py-20 bg-surface-low/10 rounded-3xl border border-outline-variant/20 max-w-md mx-auto px-6">
            <AlertCircle className="mx-auto text-on-surface-variant/40 mb-3" size={32} />
            <h4 className="font-bold text-sm text-on-surface mb-1">No Preserved Documents Found</h4>
            <p className="text-xs text-on-surface-variant/70 leading-relaxed">
              No files match your current category, decade filters, or search terms. Try adjusting them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocs.map((doc) => (
              <article
                key={doc.id}
                className="group flex flex-col bg-surface-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-sm hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                {/* Image panel */}
                <div className="h-48 w-full overflow-hidden relative bg-surface-low/30">
                  <img
                    src={doc.url}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-3 left-3 bg-surface-lowest/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-outline-variant/30 text-[9px] font-bold text-primary uppercase tracking-wider">
                    {doc.category}
                  </div>
                  {doc.verified && (
                    <div
                      title="Archival Verified"
                      className="absolute top-3 right-3 bg-primary text-on-primary p-1 rounded-full shadow-md"
                    >
                      <ShieldCheck size={12} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant/50">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {doc.date}
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-sm text-on-surface leading-tight group-hover:text-primary transition-colors">
                      {doc.title}
                    </h3>
                    
                    <p className="text-xs text-on-surface-variant/80 leading-relaxed line-clamp-3">
                      {doc.description}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="flex justify-between items-center pt-3 mt-4 border-t border-outline-variant/20">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-surface-low text-[9px] font-bold text-on-surface-variant/70 rounded uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(doc.id, doc.title, e)}
                      className="text-on-surface-variant/40 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove Document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Deposit File Uploader Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm px-4">
          <div className="bg-surface-lowest max-w-lg w-full rounded-3xl border border-outline-variant p-6 shadow-2xl animate-slide-in">
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-outline-variant/30">
              <h3 className="text-base font-bold text-primary flex items-center gap-1.5">
                <Upload size={16} />
                Deposit Archival Record
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-on-surface-variant/50 hover:text-on-surface rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image selector */}
              <div className="flex gap-4 items-center">
                <div className="w-24 h-24 rounded-2xl bg-surface-low border border-outline-variant/40 overflow-hidden flex items-center justify-center relative shrink-0">
                  {docFileUrl ? (
                    <img src={docFileUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={20} className="text-on-surface-variant/40" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                    Document File
                  </span>
                  <input
                    type="file"
                    ref={uploadInputRef}
                    onChange={handleFileSelection}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="px-4 py-2 border border-outline-variant hover:border-primary text-xs font-bold text-on-surface-variant hover:text-primary rounded-xl transition-all"
                  >
                    Select Photo or Scan
                  </button>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1.5">
                    JPG, PNG, GIF files. Compressed locally before upload.
                  </p>
                </div>
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1.5">
                    Record Title
                  </label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="E.g., Sunday Picnic"
                    className="w-full text-xs bg-surface-low border border-outline-variant rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1.5">
                    Record Date
                  </label>
                  <input
                    type="text"
                    required
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    placeholder="E.g., August 1954"
                    className="w-full text-xs bg-surface-low border border-outline-variant rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1.5">
                    Category
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="w-full text-xs bg-surface-low border border-outline-variant rounded-xl px-2 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  >
                    <option value="Photos">Photo</option>
                    <option value="Documents">Document</option>
                    <option value="Letters">Letter</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1.5">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={docTags}
                    onChange={(e) => setDocTags(e.target.value)}
                    placeholder="E.g., VISUAL, PICNIC"
                    className="w-full text-xs bg-surface-low border border-outline-variant rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1.5 ml-1">
                  Linked Individuals
                </label>
                <div className="max-h-32 overflow-y-auto bg-surface-low border border-outline-variant rounded-xl p-2 custom-scrollbar">
                  {Object.values(individuals).map(indi => (
                    <label key={indi.id} className="flex items-center gap-2 p-1.5 hover:bg-surface-lowest rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkedIndividuals.includes(indi.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLinkedIndividuals(prev => [...prev, indi.id]);
                          } else {
                            setLinkedIndividuals(prev => prev.filter(id => id !== indi.id));
                          }
                        }}
                        className="rounded text-primary focus:ring-primary h-3 w-3"
                      />
                      <span className="text-xs text-on-surface">
                        {indi.firstName} {indi.lastName}
                      </span>
                    </label>
                  ))}
                  {Object.keys(individuals).length === 0 && (
                    <p className="text-xs text-on-surface-variant/50 p-2 text-center">No individuals found in tree.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest block mb-1.5">
                  Description
                </label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Tell the story behind this item. Who is in it? Where was it taken?"
                  className="w-full text-xs bg-surface-low border border-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-24 resize-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-low transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-hover active:scale-95 transition-all shadow"
                >
                  Deposit to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
