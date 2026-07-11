"use client";

import { useState } from "react";

export interface Filters {
  location: string;
  datePosted: string;
  experienceLevel: string;
  salaryMin: string;
  salaryMax: string;
}

const EMPTY_FILTERS: Filters = {
  location: "",
  datePosted: "24h",
  experienceLevel: "",
  salaryMin: "",
  salaryMax: "",
};

interface SearchFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export { EMPTY_FILTERS };

export default function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.location,
    filters.datePosted !== "24h" ? filters.datePosted : "",
    filters.experienceLevel,
    filters.salaryMin || filters.salaryMax,
  ].filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors px-1 py-1.5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="12" y1="18" x2="20" y2="18" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 mb-1 p-3 rounded-xl border border-border bg-card">
          {/* Location */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Location</label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => onChange({ ...filters, location: e.target.value })}
              placeholder="e.g. Lahore, Remote"
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary placeholder:text-muted"
            />
          </div>

          {/* Date Posted */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Date Posted</label>
            <select
              value={filters.datePosted}
              onChange={(e) => onChange({ ...filters, datePosted: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary"
            >
              <option value="24h">Last 24 hours</option>
              <option value="3d">Last 3 days</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          {/* Experience Level */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Experience Level</label>
            <select
              value={filters.experienceLevel}
              onChange={(e) => onChange({ ...filters, experienceLevel: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary"
            >
              <option value="">Any</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-Level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          {/* Salary Range (USD) */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Salary (USD/year)</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={filters.salaryMin}
                onChange={(e) => onChange({ ...filters, salaryMin: e.target.value })}
                placeholder="Min"
                className="w-1/2 text-sm px-2 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary placeholder:text-muted"
              />
              <input
                type="number"
                value={filters.salaryMax}
                onChange={(e) => onChange({ ...filters, salaryMax: e.target.value })}
                placeholder="Max"
                className="w-1/2 text-sm px-2 py-2 rounded-lg border border-border bg-background outline-none focus:border-primary placeholder:text-muted"
              />
            </div>
          </div>

          {/* Clear button */}
          {activeCount > 0 && (
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button
                onClick={() => onChange({ ...EMPTY_FILTERS })}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
