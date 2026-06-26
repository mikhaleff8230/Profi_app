import { RUFlag } from '@/components/icons/flags/RUFlag';

export function useIsRTL() {
  return { isRTL: false, alignLeft: 'left', alignRight: 'right' } as const;
}

export const languageMenu = [
  {
    id: 'ru',
    name: 'Русский',
    value: 'ru',
    icon: <RUFlag width="20px" height="15px" />,
  },
];
