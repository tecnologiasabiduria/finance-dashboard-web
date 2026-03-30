import { useState } from 'react';
import { Calendar, BarChart3 } from 'lucide-react';
import Dashboard from './Dashboard';
import AnnualReport from './AnnualReport';

export default function Reports() {
  const [activeView, setActiveView] = useState('monthly');

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-dark-900/50 border border-white/[0.06] rounded-xl w-fit">
        <button
          onClick={() => setActiveView('monthly')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
            activeView === 'monthly'
              ? 'bg-gold-400/15 text-gold-300 shadow-[inset_0_0_12px_rgba(218,125,65,0.08)]'
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Informe Mensual
        </button>
        <button
          onClick={() => setActiveView('annual')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all text-sm ${
            activeView === 'annual'
              ? 'bg-gold-400/15 text-gold-300 shadow-[inset_0_0_12px_rgba(218,125,65,0.08)]'
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Informe Anual
        </button>
      </div>

      {/* Content */}
      {activeView === 'monthly' ? (
        <Dashboard onSwitchToAnnual={() => setActiveView('annual')} />
      ) : (
        <AnnualReport />
      )}
    </div>
  );
}
