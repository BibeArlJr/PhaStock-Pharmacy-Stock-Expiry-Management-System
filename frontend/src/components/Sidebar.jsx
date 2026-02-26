import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  LayoutDashboard,
  Pill,
  ReceiptText,
  Search,
  Settings,
  Truck,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import BrandLogo from '@/components/BrandLogo';
import SidebarTogglePill from '@/components/SidebarTogglePill';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Receipts', to: '/receipts', icon: ReceiptText },
  { label: 'Batch Stock', to: '/batch-stock', icon: Boxes },
  { label: 'Stock Issue', to: '/stock-issue', icon: ArrowLeftRight },
  { label: 'Alerts', to: '/alerts', icon: AlertTriangle },
  { label: 'Receipt Search', to: '/receipt-search', icon: Search },
  { label: 'Medicines', to: '/medicines', icon: Pill },
  { label: 'Suppliers', to: '/suppliers', icon: Truck },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <TooltipProvider>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r bg-white transition-[width] duration-200',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        <div className="flex h-16 items-center border-b px-3">
          <div className={cn('flex w-full items-center', collapsed ? 'justify-center' : 'justify-start')}>
            <BrandLogo size={collapsed ? 34 : 38} showText={!collapsed} variant="mark" />
          </div>
        </div>

        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-surface hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </NavLink>
            );

            if (!collapsed) {
              return link;
            }

            return (
              <Tooltip key={item.to}>
                <div className="relative">
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent>{item.label}</TooltipContent>
                </div>
              </Tooltip>
            );
          })}
        </nav>

        <SidebarTogglePill collapsed={collapsed} onToggle={onToggle} />
      </aside>
    </TooltipProvider>
  );
}
