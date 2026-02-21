interface HeaderProps {
  onNewOrder: () => void;
}

export function Header({ onNewOrder }: HeaderProps) {
  return (
    <header className="bg-[#2c332f] px-5 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        {/* Distillery logo mark */}
        <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center text-white font-bold text-sm shadow-sm">
          א
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">אראבה מזקקה</h1>
          <p className="text-xs text-[#b5b5a7]">מערכת ניהול לקוחות</p>
        </div>
      </div>

      <button
        onClick={onNewOrder}
        className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 active:scale-95 transition-all shadow-sm"
      >
        <span className="text-lg leading-none">+</span>
        <span>הזמנה חדשה</span>
      </button>
    </header>
  );
}
