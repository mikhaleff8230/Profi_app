import Logo from '@/components/ui/logo';
import { useUI } from '@/contexts/ui.context';
import AuthorizedMenu from './authorized-menu';
import LinkButton from '@/components/ui/link-button';
import { NavbarIcon } from '@/components/icons/navbar-icon';
import { motion } from 'framer-motion';
import { useTranslation } from 'next-i18next';
import { Routes } from '@/config/routes';
import {
  adminAndOwnerOnly,
  getAuthCredentials,
  hasAccess,
} from '@/utils/auth-utils';
import { useSellerBalanceQuery } from '@/data/seller-balance';
import { WalletIcon } from '@/components/icons/wallet-icon';
import DepositBalanceModal from '@/components/billing/deposit-balance-modal';
import { useState } from 'react';

const Navbar = () => {
	const { t } = useTranslation();
	const { toggleSidebar } = useUI();

	const { permissions } = getAuthCredentials();
  const { balance, isLoading: isBalanceLoading, error: balanceError } = useSellerBalanceQuery();
  const [showDepositModal, setShowDepositModal] = useState(false);

  return (
    <header className="fixed z-40 w-full bg-white shadow">
      <nav className="flex items-center justify-between px-5 py-4 md:px-8">
        {/* <!-- Mobile menu button --> */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleSidebar}
          className="flex h-full items-center justify-center p-2 focus:text-accent focus:outline-none lg:hidden"
        >
          <NavbarIcon />
        </motion.button>

        <div className="ms-5 me-auto hidden md:flex">
          <Logo />
        </div>

        <div className="space-s-8 flex items-center">
          {/* Отображение баланса */}
          {hasAccess(adminAndOwnerOnly, permissions) && (
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center gap-2 ms-4 md:ms-6 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <WalletIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {isBalanceLoading ? (
                  <span className="text-gray-400">...</span>
                ) : balanceError ? (
                  <span className="text-gray-400" title="Не удалось загрузить баланс">—</span>
                ) : (
                  `${(balance?.balance ?? 0).toFixed(2)} ₽`
                )}
              </span>
            </button>
          )}
          {hasAccess(adminAndOwnerOnly, permissions) && (
            <LinkButton
              href={Routes.shop.create}
              className="ms-4 md:ms-6"
              size="small"
            >
              {t('common:text-create-shop')}
            </LinkButton>
          )}
          <AuthorizedMenu />
        </div>
      </nav>
      <DepositBalanceModal 
        isOpen={showDepositModal} 
        onClose={() => setShowDepositModal(false)} 
      />
    </header>
  );
};

export default Navbar;
