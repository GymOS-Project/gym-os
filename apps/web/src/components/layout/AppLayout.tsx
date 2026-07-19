import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, Users, UserPlus, List, Package, PhoneCall, MessageSquare, CreditCard, RefreshCw, UserSearch, Bell, Circle as XCircle, ChartBar as BarChart2, Receipt, Star, Share2, Clock, TriangleAlert as AlertTriangle, Dumbbell, ChevronDown, ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    label: 'Members',
    icon: Users,
    children: [
      { label: 'Add Member', href: '/members/add', icon: UserPlus },
      { label: 'Member List', href: '/members', icon: List, exact: true },
      { label: 'Package Types', href: '/members/packages', icon: Package },
    ],
  },
  {
    label: 'Follow Ups',
    icon: PhoneCall,
    children: [
      { label: 'Common Follow Up', href: '/followups/common', icon: MessageSquare },
      { label: 'Payment Due', href: '/followups/payment-due', icon: CreditCard },
      { label: 'Renewal Follow Up', href: '/followups/renewal', icon: RefreshCw },
    ],
  },
  {
    label: 'Enquiry',
    icon: UserSearch,
    children: [
      { label: 'Add Enquiry', href: '/enquiry/add', icon: UserPlus },
      { label: 'Data List', href: '/enquiry', icon: List, exact: true },
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

function isNavItemActive(item: NavItem, pathname: string) {
  if (!item.href) {
    return item.children?.some(child => isNavItemActive(child, pathname)) ?? false;
  }

  if (item.href === '/') {
    return pathname === '/';
  }

  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(item.href + '/');
}

function NavItemComponent({
  item,
  depth = 0,
  collapsed = false,
  onExpand,
}: {
  item: NavItem;
  depth?: number;
  collapsed?: boolean;
  onExpand?: () => void;
}) {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some(child => isNavItemActive(child, location.pathname));
  });

  if (item.href) {
    const isActive = isNavItemActive(item, location.pathname);
    return (
      <NavLink
        to={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
          collapsed ? 'justify-center px-2' : '',
          depth > 0 ? 'ml-4 pl-3' : '',
          isActive
            ? 'bg-primary/15 text-primary font-medium shadow-sm'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          if (collapsed) {
            onExpand?.();
            return;
          }
          setOpen(!open);
        }}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
          collapsed ? 'justify-center px-2' : '',
          open ? 'text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
        {!collapsed && (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
      </button>
      {open && !collapsed && (
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
  const { admin, gyms, selectedGymId, selectedGym, setSelectedGymId, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const Sidebar = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-4', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground shadow-md">
          <Dumbbell className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-bold text-sidebar-foreground">{selectedGym?.gym_name || (gyms.length > 1 ? 'All Gyms' : admin?.gym_name) || 'GymOs'}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{admin?.owner_name || 'Admin Panel'}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map(item => (
          <NavItemComponent key={item.label} item={item} collapsed={collapsed} onExpand={() => setDesktopCollapsed(false)} />
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn('hidden shrink-0 overflow-hidden border-r border-border transition-[width] duration-200 lg:block', desktopCollapsed ? 'w-20' : 'w-64')}>
        <Sidebar collapsed={desktopCollapsed} />
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
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border/80 bg-background/85 px-4 backdrop-blur-xl lg:px-6">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="hidden text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
            onClick={() => setDesktopCollapsed((value) => !value)}
            aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {desktopCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          {title && <h1 className="font-semibold text-foreground">{title}</h1>}
          <div className="ml-auto flex items-center gap-3">
            {gyms.length > 1 && (
              <Select value={selectedGymId} onValueChange={setSelectedGymId}>
                <SelectTrigger className="w-[150px] sm:w-[180px]">
                  <SelectValue placeholder="Filter gyms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gyms</SelectItem>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>{gym.gym_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground">{admin?.owner_name}</p>
              <p className="text-xs text-muted-foreground">{selectedGym?.gym_name || (gyms.length > 1 ? 'All Gyms' : admin?.gym_name)}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-8 w-8 border border-border/60 shadow-sm">
                    <AvatarImage src={admin?.logo_url || undefined} alt={admin?.owner_name || 'Admin'} className="object-cover" />
                    <AvatarFallback className="gradient-primary text-sm font-medium text-primary-foreground">
                      {(admin?.owner_name || 'A')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{admin?.owner_name || 'Admin'}</p>
                    <p className="text-xs font-normal text-muted-foreground">{selectedGym?.gym_name || (gyms.length > 1 ? 'All Gyms' : admin?.gym_name) || 'GymOs'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <ThemeToggle isToggle={true} className=''/>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
