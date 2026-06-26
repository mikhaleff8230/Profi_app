import type { EdgeInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

/** Высота области с иконками/подписями (без системного отступа снизу). */
export const TAB_BAR_BASE_HEIGHT = 58;
export const TAB_BAR_PADDING_TOP = 4;

/** Стиль нижней панели вкладок с учётом home indicator / gesture bar. */
export function getTabBarStyle(insets: EdgeInsets) {
  const bottom = insets.bottom;
  return {
    borderTopColor: colors.neutral100,
    backgroundColor: colors.white,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: bottom,
    height: TAB_BAR_BASE_HEIGHT + bottom,
  };
}
