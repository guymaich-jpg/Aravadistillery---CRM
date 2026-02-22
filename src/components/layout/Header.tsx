import { LogOut } from 'lucide-react';
import { getSession, logout } from '@/lib/auth/simpleAuth';

interface HeaderProps {
  onNewOrder: () => void;
}

function UserMenu() {
  const session = getSession();
  if (!session) return null;

  const initials = session.name.charAt(0).toUpperCase();

  function handleLogout() {
    logout();
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="w-7 h-7 rounded-full bg-[#716a56] flex items-center justify-center text-white text-xs font-bold">
        {initials}
      </div>
      <span className="hidden sm:block text-xs text-[#b5b5a7] max-w-[120px] truncate">
        {session.name}
      </span>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#b5b5a7] hover:text-white hover:bg-white/10 transition-colors touch-target"
        title="יציאה"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:block">יציאה</span>
      </button>
    </div>
  );
}

export function Header({ onNewOrder }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#2c332f] px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shadow-md safe-area-top">
      {/* Logo + title */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg brand-gradient flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">
          A
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-white leading-tight">Aravadistillery CRM</h1>
          <p className="text-[10px] sm:text-xs text-[#b5b5a7] hidden xs:block">מערכת ניהול לקוחות</p>
        </div>
      </div>

      {/* Right side: new order + user menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onNewOrder}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-amber-500 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-600 active:scale-95 transition-all shadow-sm touch-target"
        >
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:block">הזמנה חדשה</span>
          <span className="sm:hidden">הזמנה</span>
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
