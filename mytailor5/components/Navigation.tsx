import React from 'react';
import { ViewState } from '../types';
import { Home, PlusCircle, List, Settings } from 'lucide-react';

interface Props {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Navigation: React.FC<Props> = ({ currentView, setView }) => {
  const navItems = [
    { id: 'dashboard', icon: Home, label: '概览' },
    { id: 'add', icon: PlusCircle, label: '记一笔' },
    { id: 'list', icon: List, label: '记录' },
    { id: 'settings', icon: Settings, label: '管理' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 shadow-lg z-50">
      <div className="flex justify-between items-center max-w-md mx-auto pb-4">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`flex flex-col items-center justify-center w-16 transition-all duration-200 ${
                isActive ? 'text-brand-600 transform scale-105' : 'text-gray-400'
              }`}
            >
              <Icon size={isActive ? 28 : 24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};