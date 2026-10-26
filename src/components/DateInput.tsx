import React, { useRef, useState, useEffect } from "react";
import { Calendar } from "lucide-react";

interface DateInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "MM/DD/YYYY"
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse custom, standard, or GEDCOM dates to ISO (YYYY-MM-DD) for the date picker
  const getIsoValue = (val: string): string => {
    if (!val) return "";
    
    // If already MM/DD/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [m, d, y] = val.split("/");
      return `${y}-${m}-${d}`;
    }
    
    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return val;
    }
    
    // Try parsing standard GEDCOM date format, e.g., "12 JUN 1892" or "JUN 1892" or "1892"
    const parts = val.trim().split(/\s+/);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
    if (parts.length === 3) {
      // DD MMM YYYY
      const d = parseInt(parts[0], 10);
      const day = d < 10 ? `0${d}` : `${d}`;
      const mIndex = months.indexOf(parts[1].toUpperCase());
      if (mIndex !== -1) {
        const month = mIndex + 1 < 10 ? `0${mIndex + 1}` : `${mIndex + 1}`;
        const year = parts[2];
        if (/^\d{4}$/.test(year)) {
          return `${year}-${month}-${day}`;
        }
      }
    } else if (parts.length === 2) {
      // MMM YYYY -> Default to 1st of month
      const mIndex = months.indexOf(parts[0].toUpperCase());
      if (mIndex !== -1) {
        const month = mIndex + 1 < 10 ? `0${mIndex + 1}` : `${mIndex + 1}`;
        const year = parts[1];
        if (/^\d{4}$/.test(year)) {
          return `${year}-${month}-01`;
        }
      }
    } else if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
      // YYYY -> Default to Jan 1st
      return `${parts[0]}-01-01`;
    }
    
    // Fallback: try standard JavaScript Date parsing
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const dt = d.getDate();
      return `${y}-${m < 10 ? "0" + m : m}-${dt < 10 ? "0" + dt : dt}`;
    }
    
    return "";
  };

  // Convert ISO format (YYYY-MM-DD) to UI format (MM/DD/YYYY)
  const isoToUi = (iso: string): string => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return iso;
  };

  // Check if string is a valid calendar date matching MM/DD/YYYY
  const validateDate = (val: string) => {
    if (!val) {
      setError(null);
      return;
    }
    const match = val.match(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/);
    if (!match) {
      setError("Use MM/DD/YYYY format");
      return;
    }
    const m = parseInt(match[1], 10);
    const d = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    
    // Verify using Date object to catch invalid dates like Feb 30th
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      setError("Invalid calendar date");
    } else {
      setError(null);
    }
  };

  // Run validation when value changes
  useEffect(() => {
    validateDate(value);
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Strips non-digits and automatically applies slash formatting
    const clean = val.replace(/\D/g, "");
    if (clean.length > 0) {
      let formatted = clean.substring(0, 2);
      if (clean.length > 2) {
        formatted += "/" + clean.substring(2, 4);
      }
      if (clean.length > 4) {
        formatted += "/" + clean.substring(4, 8);
      }
      val = formatted;
    }
    
    onChange(val);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value;
    if (isoVal) {
      const uiVal = isoToUi(isoVal);
      onChange(uiVal);
    }
  };

  const triggerDatePicker = () => {
    const picker = hiddenInputRef.current;
    if (picker) {
      try {
        if (typeof picker.showPicker === "function") {
          picker.showPicker();
        } else {
          picker.focus();
          picker.click();
        }
      } catch (err) {
        // Fallback
        picker.click();
      }
    }
  };

  return (
    <div className="relative">
      <label className="text-[8px] font-bold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full text-xs bg-surface-low border rounded-lg pl-2.5 pr-8 py-1 focus:ring-0 focus:outline-none transition-all ${
            error 
              ? "border-red-500/50 focus:border-red-500 text-red-200" 
              : "border-outline-variant focus:border-primary"
          }`}
        />
        
        {/* Native hidden date picker */}
        <input
          type="date"
          ref={hiddenInputRef}
          value={getIsoValue(value)}
          onChange={handlePickerChange}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
        />

        {/* Calendar toggle button */}
        <button
          type="button"
          onClick={triggerDatePicker}
          className="absolute right-2 text-on-surface-variant/50 hover:text-primary transition-all p-1"
          title="Open Calendar"
        >
          <Calendar size={13} />
        </button>
      </div>
      {error && (
        <span className="text-[9px] text-red-400 font-bold block mt-0.5 ml-1 animate-pulse">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
};
