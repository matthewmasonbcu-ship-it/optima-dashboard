import type { ConfidenceFilter, FilterType, SortType } from "@/lib/types";

type FilterOption = {
  label: string;
  value: FilterType;
  count: number;
};

type ConfidenceOption = {
  label: string;
  value: ConfidenceFilter;
  count: number;
};

type SortOption = {
  label: string;
  value: SortType;
};

type DashboardControlsProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  activeFilter: FilterType;
  setActiveFilter: (value: FilterType) => void;
  filters: FilterOption[];

  confidenceFilter: ConfidenceFilter;
  setConfidenceFilter: (value: ConfidenceFilter) => void;
  confidenceFilters: ConfidenceOption[];

  sortType: SortType;
  setSortType: (value: SortType) => void;
  sortOptions: SortOption[];

  showingCount: number;
  totalCount: number;
};

function ControlLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </p>
  );
}

function buttonClass(isActive: boolean) {
  return `rounded-xl px-4 py-2 text-sm font-bold transition ${
    isActive
      ? "bg-green-400 text-black"
      : "border border-gray-800 bg-black text-gray-300 hover:border-gray-600"
  }`;
}

export function DashboardControls({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  filters,
  confidenceFilter,
  setConfidenceFilter,
  confidenceFilters,
  sortType,
  setSortType,
  sortOptions,
  showingCount,
  totalCount,
}: DashboardControlsProps) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-800 bg-black p-5">
      <div className="mb-5">
        <ControlLabel>Ticker Search</ControlLabel>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search ticker... example: SPY, TSLA, NVDA"
            className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:border-green-500"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-bold text-gray-300 transition hover:border-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <ControlLabel>Setup Filter</ControlLabel>
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={buttonClass(activeFilter === filter.value)}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        <div>
          <ControlLabel>Confidence Filter</ControlLabel>
          <div className="flex flex-wrap gap-3">
            {confidenceFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setConfidenceFilter(filter.value)}
                className={buttonClass(confidenceFilter === filter.value)}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        <div>
          <ControlLabel>Sort By</ControlLabel>
          <div className="flex flex-wrap gap-3">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortType(option.value)}
                className={buttonClass(sortType === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
        Showing <span className="font-bold text-white">{showingCount}</span> of{" "}
        <span className="font-bold text-white">{totalCount}</span> scans.
      </div>
    </div>
  );
}