import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Users, UserPlus, List, Package, PhoneCall, MessageSquare, CreditCard, RefreshCw, ClipboardList, UserSearch, Bell, Circle as XCircle, ChartBar as BarChart2, Receipt, Star, Share2, Clock, TriangleAlert as AlertTriangle, Dumbbell, ChevronDown, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    label: 'Members',
    icon: Users,
    children: [
      { label: 'Add Member', href: '/members/add', icon: UserPlus },
      { label: 'Member List', href: '/members', icon: List },
      { label: 'Package Types', href: '/members/packages', icon: Package },
    ],
  },
  {
    label: 'Follow Ups',
    icon: PhoneCall,
    children: [
      { label: 'Common Follow Up', href: '/followups/common', icon: MessageSquare },
      { label: 'Enquiry Follow Up', href: '/followups/enquiry', icon: ClipboardList },
      { label: 'Payment Due', href: '/followups/payment-due', icon: CreditCard },
      { label: 'Renewal Follow Up', href: '/followups/renewal', icon: RefreshCw },
    ],
  },
  {
    label: 'Enquiry',
    icon: UserSearch,
    children: [
      { label: 'Add Enquiry', href: '/enquiry/add', icon: UserPlus },
      { label: 'Data List', href: '/enquiry', icon: List },
      { label: 'Follow Up List', href: '/enquiry/followups', icon: Bell },
      { label: 'Not Interested', href: '/enquiry/not-interested', icon: XCircle },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart2,
    children: [
      { label: 'Sales History', href: '/reports/sales', icon: BarChart2 },
      { label: 'Transactions', href: '/reports/transactions', icon: Receipt },
      { label: 'Member Reviews', href: '/reports/reviews', icon: Star },
      { label: 'Reference Members', href: '/reports/references', icon: Share2 },
      { label: 'Report by Shift', href: '/reports/shift', icon: Clock },
      { label: 'Near to Expire', href: '/reports/expiring', icon: AlertTriangle },
    ],
  },
];

function NavItemComponent({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some(child => child.href === location.pathname ||
      (child.href !== '/' && location.pathname.startsWith(child.href || '')));
  });

  if (item.href) {
    const isActive = item.href === '/'
      ? location.pathname === '/'
      : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    return (
      <NavLink
        to={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
          depth > 0 ? 'ml-4 pl-3' : '',
          isActive
            ? 'bg-teal-500/20 text-teal-400 font-medium'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
          open ? 'text-slate-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {item.children?.map(child => (
            <NavItemComponent key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500">
          <Dumbbell className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{admin?.gym_name || 'GymOs'}</p>
          <p className="text-xs text-slate-400 truncate">{admin?.owner_name || 'Admin Panel'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavItemComponent key={item.label} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border overflow-hidden">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 h-full w-64 z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {title && <h1 className="font-semibold text-foreground">{title}</h1>}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{admin?.owner_name}</p>
              <p className="text-xs text-muted-foreground">{admin?.gym_name}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white text-sm font-medium">
              {(admin?.owner_name || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
