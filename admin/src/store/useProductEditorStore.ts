import { create } from 'zustand';
import { Product } from '@/types';

export type ProductEditorState = {
  // Текущий шаг
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Данные товара
  product: Partial<Product> | null;
  setProduct: (data: Partial<Product>) => void;
  updateProduct: (data: Partial<Product>) => void;
  reset: () => void;

  // Состояние загрузки
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Ошибки
  errors: Record<string, string>;
  setError: (field: string, message: string) => void;
  clearErrors: () => void;

  // Автосохранение
  lastSaved: Date | null;
  setLastSaved: (date: Date) => void;

  // Предпросмотр
  previewData: any;
  setPreviewData: (data: any) => void;
};

const STEPS = [
  'general',      // Основная информация
  'media',        // Фото/Видео
  'attributes',   // Характеристики
  'pricing',      // Цена и наличие
  'preview',      // Предпросмотр
];

export const useProductEditorStore = create<ProductEditorState>((set, get) => ({
  // Шаги
  currentStep: 0,
  setCurrentStep: (step: number) => {
    if (step >= 0 && step < STEPS.length) {
      set({ currentStep: step });
    }
  },
  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < STEPS.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },
  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  // Данные товара
  product: null,
  setProduct: (data) => set({ product: data }),
  updateProduct: (data) =>
    set((state) => ({
      product: { ...state.product, ...data },
    })),
  reset: () =>
    set({
      product: null,
      currentStep: 0,
      errors: {},
      lastSaved: null,
      previewData: null,
    }),

  // Состояние загрузки
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Ошибки
  errors: {},
  setError: (field, message) =>
    set((state) => ({
      errors: { ...state.errors, [field]: message },
    })),
  clearErrors: () => set({ errors: {} }),

  // Автосохранение
  lastSaved: null,
  setLastSaved: (date) => set({ lastSaved: date }),

  // Предпросмотр
  previewData: null,
  setPreviewData: (data) => set({ previewData: data }),
}));

