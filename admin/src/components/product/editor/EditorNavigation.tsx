import { CheckIcon } from '@/components/icons/check';
import React from 'react';

type Step = {
  id: string;
  label: string;
};

type EditorNavigationProps = {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
  productId?: string; // ID товара, если товар сохранен
};

export default function EditorNavigation({
  steps,
  currentStep,
  onStepClick,
  productId,
}: EditorNavigationProps) {
  // Для сохраненного товара разрешаем переход на любой шаг
  // Для нового товара - только на пройденные шаги
  const isProductSaved = !!productId;

  return (
    <>
      {/* Десктопная версия - вертикальная боковая панель */}
      <aside className="hidden lg:block w-64 bg-white rounded-lg shadow-sm p-4 sticky top-4 h-fit">
        <h2 className="text-lg font-semibold text-heading mb-4">Шаги</h2>
        <nav className="space-y-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;
            // Для сохраненного товара все шаги доступны, для нового - только пройденные
            const isClickable = isProductSaved || !isUpcoming;

            return (
              <button
                key={step.id}
                onClick={() => {
                  if (isClickable) {
                    onStepClick(index);
                  }
                }}
                disabled={!isClickable}
                className={`w-full text-left p-3 rounded-lg transition-all border ${
                  isCurrent
                    ? 'bg-accent-300 border-border-base text-accent-text shadow-sm'
                    : isCompleted
                    ? 'bg-accent-300 border-border-base text-accent-text hover:bg-accent-400 hover:border-accent-600 cursor-pointer'
                    : isClickable && isProductSaved
                    ? 'bg-light border-border-base text-heading hover:bg-accent-300 hover:border-accent-500 cursor-pointer'
                    : 'bg-light border-border-base text-muted cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      isCurrent
                        ? 'bg-accent text-accent-text'
                        : isCompleted
                        ? 'bg-accent text-accent-text'
                        : isClickable && isProductSaved
                        ? 'bg-border-base text-heading'
                        : 'bg-border-base text-muted'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{step.label}</div>
                    {isCurrent && (
                      <div className="text-xs text-accent-600 mt-1">Текущий шаг</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Мобильная версия - горизонтальная прокручиваемая плашка */}
      <div className="lg:hidden w-full bg-white rounded-lg shadow-sm p-3 mb-4 sticky top-4 z-10">
        <h2 className="text-sm font-semibold text-heading mb-3 px-1">Шаги создания товара</h2>
        <nav className="overflow-x-auto -mx-3 px-3">
          <div className="flex gap-2 min-w-max pb-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isUpcoming = index > currentStep;
              // Для сохраненного товара все шаги доступны, для нового - только пройденные
              const isClickable = isProductSaved || !isUpcoming;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (isClickable) {
                      onStepClick(index);
                    }
                  }}
                  disabled={!isClickable}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg transition-all border min-w-[100px] ${
                    isCurrent
                      ? 'bg-accent-300 border-accent-500 text-accent-text shadow-sm'
                      : isCompleted
                      ? 'bg-accent-300 border-accent-400 text-accent-text hover:bg-accent-400 hover:border-accent-600 cursor-pointer'
                      : isClickable && isProductSaved
                      ? 'bg-light border-border-base text-heading hover:bg-accent-300 hover:border-accent-500 cursor-pointer'
                      : 'bg-light border-border-base text-muted cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      isCurrent
                        ? 'bg-accent text-accent-text'
                        : isCompleted
                        ? 'bg-accent text-accent-text'
                        : isClickable && isProductSaved
                        ? 'bg-border-base text-heading'
                        : 'bg-border-base text-muted'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-medium leading-tight ${isCurrent ? 'text-accent-text' : ''}`}>
                      {step.label}
                    </div>
                    {isCurrent && (
                      <div className="text-[10px] text-accent-600 mt-0.5">Текущий</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}

