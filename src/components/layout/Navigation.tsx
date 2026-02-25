import { NAV_TABS, type TabId } from '@/config/tabs';
import { useStockCtx } from '@/store/StockContext';
import { getSession } from '@/lib/auth/simpleAuth';
import { isManager } from '@/lib/auth/managers';

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const { stockLevels } = useStockCtx();
  const alertCount = stockLevels.filter(
    l => l.minimumStock > 0 && l.currentStock <= l.minimumStock,
  ).length;
  const session = getSession();
  const visibleTabs = NAV_TABS.filter(tab =>
    tab.id !== 'management' || (session && isManager(session.email)),
  );

  return (
    <>
      {/* Desktop: top nav bar (sm and above) */}
      <nav className="hidden sm:block bg-white border-b border-gray-200 px-2 overflow-x-auto shadow-sm">
        <div className="flex gap-0.5 min-w-max">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const showBadge = tab.id === 'inventory' && alertCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  'relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[#2c332f] text-[#2c332f] bg-[#efefec]/60'
                    : 'border-transparent text-[#716a56] hover:text-[#252525] hover:border-gray-300',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <tab.Icon className="h-4 w-4" />
                <span>{tab.labelHe}</span>
                {showBadge && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold" aria-label={`${alertCount} התראות מלאי`}>
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile: bottom tab bar (below sm) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)] safe-area-bottom" aria-label="ניווט ראשי">
        <div className="flex justify-around items-stretch">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const showBadge = tab.id === 'inventory' && alertCount > 0;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  'relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[56px] transition-colors',
                  isActive
                    ? 'text-[#2c332f]'
                    : 'text-[#716a56]',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.labelHe}
              >
                <tab.Icon className={`h-5 w-5 ${isActive ? 'text-[#c9821a]' : ''}`} />
                <span className="text-[10px] font-medium leading-tight">{tab.labelHe}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#c9821a] rounded-full" />
                )}
                {showBadge && (
                  <span className="absolute top-1 right-1/4 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold" aria-label={`${alertCount} התראות מלאי`}>
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
