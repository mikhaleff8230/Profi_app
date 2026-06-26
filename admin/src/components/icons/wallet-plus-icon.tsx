import React from 'react';

export const WalletPlusIcon: React.FC<React.SVGAttributes<{}>> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Кошелек */}
      <path d="M19 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M19 7V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" />
      <path d="M19 11h-3a2 2 0 0 0 0 4h3" />
      {/* Плюсик в кружке справа вверху */}
      <circle cx="19" cy="4" r="2.5" fill="currentColor" />
      <path d="M19 2.5v3M17.5 4h3" stroke="white" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};

