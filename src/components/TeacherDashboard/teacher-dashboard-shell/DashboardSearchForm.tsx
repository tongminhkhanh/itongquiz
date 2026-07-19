import { Search } from 'lucide-react';
import type React from 'react';
import { DASHBOARD_SEARCH_ITEMS } from './dashboardConfig';

interface DashboardSearchFormProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const DashboardSearchForm = ({
  searchQuery,
  setSearchQuery,
  onSubmit,
}: DashboardSearchFormProps) => (
  <form onSubmit={onSubmit} className="relative hidden md:block">
    <label htmlFor="teacher-dashboard-search" className="sr-only">Tìm chức năng</label>
    <input
      id="teacher-dashboard-search"
      type="search"
      list="teacher-dashboard-search-options"
      value={searchQuery}
      onChange={event => setSearchQuery(event.target.value)}
      placeholder="Tìm chức năng..."
      className="w-52 rounded-full border border-slate-200 bg-slate-100 py-2 pl-4 pr-10 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-500 lg:w-64"
    />
    <button
      type="submit"
      aria-label="Tìm chức năng"
      className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <Search aria-hidden="true" className="size-4" />
    </button>
    <datalist id="teacher-dashboard-search-options">
      {DASHBOARD_SEARCH_ITEMS.map(item => <option key={item.tab} value={item.label} />)}
    </datalist>
  </form>
);
