import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SidebarTogglePill({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="absolute right-[-14px] top-1/2 z-50 -translate-y-1/2"
    >
      <span className="sidebar-toggle-pill">
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
