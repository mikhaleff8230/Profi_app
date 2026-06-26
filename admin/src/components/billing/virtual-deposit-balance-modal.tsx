import { useVirtualDepositMutation } from '@/data/seller-balance';
import Button from '@/components/ui/button';
import { useState } from 'react';

interface VirtualDepositBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: number;
  sellerName?: string;
}

export default function VirtualDepositBalanceModal({ 
  isOpen, 
  onClose, 
  sellerId,
  sellerName 
}: VirtualDepositBalanceModalProps) {
  const { mutate: virtualDeposit, isLoading: isDepositing } = useVirtualDepositMutation();
  const [depositAmount, setDepositAmount] = useState('');

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0 && sellerId) {
      virtualDeposit(
        { 
          seller_id: sellerId, 
          amount 
        },
        {
          onSuccess: () => {
            setDepositAmount('');
            onClose();
          }
        }
      );
    }
  };

  const handleClose = () => {
    setDepositAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-heading mb-4">
          Виртуальное пополнение баланса
        </h3>
        {sellerName && (
          <p className="text-sm text-body mb-4">
            Продавец: <span className="font-medium">{sellerName}</span>
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-body mb-2">
              Сумма пополнения (₽)
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-heading"
              placeholder="Введите сумму"
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDepositing}
            >
              Отмена
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isDepositing}
            >
              {isDepositing ? 'Обработка...' : 'Пополнить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

