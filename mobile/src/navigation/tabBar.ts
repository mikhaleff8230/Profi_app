import type { EdgeInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

/** Высота области с иконками/подписями (без системного отступа снизу). */
export const TAB_BAR_BASE_HEIGHT = 78;
export const TAB_BAR_PADDING_TOP = 8;

/** Стиль нижней панели вкладок с учётом home indicator / gesture bar. */
export function getTabBarStyle(insets: EdgeInsets) {
  const bottom = insets.bottom;
  return {
    borderTopWidth: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: bottom,
    height: TAB_BAR_BASE_HEIGHT + bottom,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  };
}
