import { useAuth0 } from '@auth0/auth0-react';
import { LogOut } from 'lucide-react';
import { isAuth0Configured } from '@/lib/auth/config';

interface HeaderProps {
  onNewOrder: () => void;
}

function UserMenu() {
  const { user, logout } = useAuth0();

  return (
    <div className="flex items-center gap-2">
      {/* User avatar */}
      {user?.picture ? (
        <img
          src={user.picture}
          alt={user.name ?? 'User'}
          className="w-7 h-7 rounded-full border-2 border-white/30 object-cover"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-[#716a56] flex items-center justify-center text-white text-xs font-bold">
          {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name — hidden on small screens */}
      <span className="hidden sm:block text-xs text-[#b5b5a7] max-w-[120px] truncate">
        {user?.name ?? user?.email ?? ''}
      </span>

      {/* Logout */}
      <button
        onClick={() =>
          logout({ logoutParams: { returnTo: window.location.origin + import.meta.env.BASE_URL } })
        }
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#b5b5a7] hover:text-white hover:bg-white/10 transition-colors"
        title="יציאה"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:block">יציאה</span>
      </button>
    </div>
  );
}

export function Header({ onNewOrder }: HeaderProps) {
  const auth0Active = isAuth0Configured();

  return (
    <header className="bg-[#2c332f] px-5 py-3 flex items-center justify-between shadow-md">
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
          א
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">אראבה מזקקה</h1>
          <p className="text-xs text-[#b5b5a7]">מערכת ניהול לקוחות</p>
        </div>
      </div>

      {/* Right side: new order + user menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewOrder}
          className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 active:scale-95 transition-all shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:block">הזמנה חדשה</span>
          <span className="sm:hidden">הזמנה</span>
        </button>

        {auth0Active && <UserMenu />}
      </div>
    </header>
  );
}
