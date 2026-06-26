import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Button from '@/components/ui/button';
import { Plan } from '@/data/plan';

interface PlanSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: Plan | null;
  newPlan: Plan;
  isLoading?: boolean;
  canSwitch?: boolean;
  switchError?: string | null;
}

export default function PlanSwitchModal({
  isOpen,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  isLoading = false,
  canSwitch = true,
  switchError = null,
}: PlanSwitchModalProps) {
  const getPlanName = (plan: Plan | null) => {
    if (!plan) return 'не выбран';
    return plan.name;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-heading mb-4"
                >
                  Подтверждение смены тарифа
                </Dialog.Title>

                <div className="mt-2">
                  <p className="text-sm text-body mb-4">
                    Вы собираетесь перейти на тариф <strong className="text-heading">{newPlan.name}</strong>.
                  </p>

                  {currentPlan && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                      <p className="text-sm text-body">
                        <span className="font-medium">Текущий тариф:</span> {currentPlan.name}
                      </p>
                      <p className="text-sm text-body mt-1">
                        <span className="font-medium">Новый тариф:</span> {newPlan.name}
                      </p>
                      {newPlan.price > 0 && (
                        <p className="text-sm text-body mt-1">
                          <span className="font-medium">Стоимость:</span> {newPlan.price} ₽ / мес
                        </p>
                      )}
                    </div>
                  )}

                  {switchError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-800 dark:text-red-200">{switchError}</p>
                    </div>
                  )}

                  {!canSwitch && !switchError && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Вы уже меняли тариф в этом месяце. Смена тарифа возможна только один раз в месяц.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading || !canSwitch}
                    loading={isLoading}
                  >
                    Подтвердить
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

