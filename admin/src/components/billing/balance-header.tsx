import { useSellerBalanceQuery } from '@/data/seller-balance';
import Button from '@/components/ui/button';
import Loader from '@/components/ui/loader/loader';
import { useState } from 'react';
import DepositBalanceModal from './deposit-balance-modal';

interface BalanceHeaderProps {
  sellerId?: number;
}

export default function BalanceHeader({ sellerId }: BalanceHeaderProps) {
  const { balance, isLoading } = useSellerBalanceQuery();
  const [showDepositModal, setShowDepositModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-body">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-body">Баланс:</span>
        <span className="text-lg font-semibold text-heading">
          {balance?.balance.toFixed(2) || '0.00'} ₽
        </span>
      </div>
      <Button
        size="small"
        onClick={() => setShowDepositModal(true)}
      >
        Пополнить
      </Button>

      <DepositBalanceModal 
        isOpen={showDepositModal} 
        onClose={() => setShowDepositModal(false)} 
      />
    </div>
  );
}

