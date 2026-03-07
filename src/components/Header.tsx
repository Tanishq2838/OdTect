import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { History, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 overflow-hidden rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <img src="/logo.png" alt="O_Dtect" className="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-foreground">
              O_Dtect <span className="text-primary font-light">Pro</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/">
              <Button variant={isActive('/') ? "secondary" : "ghost"} size="sm" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Analysis
              </Button>
            </Link>
            <Link to="/history">
              <Button variant={isActive('/history') ? "secondary" : "ghost"} size="sm" className="gap-2">
                <History className="h-4 w-4" />
                History
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-border/50">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-foreground leading-none">{user.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.licenseId}</span>
              </div>
              <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                <User className="h-5 w-5" />
              </div>
            </div>
          )}

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={logout} title="Sign Out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
