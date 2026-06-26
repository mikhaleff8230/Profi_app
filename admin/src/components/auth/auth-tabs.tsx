import { useState } from 'react';
import cn from 'classnames';

interface AuthTabsProps {
  activeTab: 'phone' | 'email';
  onTabChange: (tab: 'phone' | 'email') => void;
}

export default function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
  return (
    <div className="mb-6 flex rounded-lg bg-gray-100 p-1 dark:bg-dark-400">
      <button
        type="button"
        onClick={() => onTabChange('phone')}
        className={cn(
          'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
          {
            'bg-white text-dark shadow-sm dark:bg-dark-300 dark:text-light': activeTab === 'phone',
            'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200': activeTab === 'email',
          }
        )}
      >
        По телефону
      </button>
      <button
        type="button"
        onClick={() => onTabChange('email')}
        className={cn(
          'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
          {
            'bg-white text-dark shadow-sm dark:bg-dark-300 dark:text-light': activeTab === 'email',
            'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200': activeTab === 'phone',
          }
        )}
      >
        По email
      </button>
    </div>
  );
}

