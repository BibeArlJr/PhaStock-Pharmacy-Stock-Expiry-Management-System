import { useNavigate } from 'react-router-dom';

import TopbarSearch from '@/components/TopbarSearch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function Topbar({ isSidebarCollapsed }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.fullName || user?.email || 'Staff';
  const pharmacyName = user?.pharmacy?.name || 'Unknown Pharmacy';

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
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <TopbarSearch />
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
