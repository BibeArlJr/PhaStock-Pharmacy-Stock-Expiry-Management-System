import { useNavigate } from 'react-router-dom';

import TopbarSearch from '@/components/TopbarSearch';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Topbar({ isSidebarCollapsed }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.fullName || user?.email || 'Staff';
  const pharmacyName = user?.pharmacy?.name || 'Unknown Pharmacy';
  const initials = displayName
    .split(' ')
    .map((segment) => segment.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-30 h-16 border-b bg-white px-4 md:px-6',
        isSidebarCollapsed ? 'left-[72px]' : 'left-[260px]'
      )}
    >
      <div className="flex h-full items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{pharmacyName}</p>
        </div>

        <div className="flex items-center justify-end gap-4">
          <TopbarSearch />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-3 rounded-full border border-input bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:border-border hover:bg-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground">
                {initials || '??'}
              </span>
              <span className="max-w-[140px] truncate">{displayName}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="py-1">
              <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile?tab=pharmacy')}>
                Pharmacy details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
