import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import { colors } from "../src/theme";

type Props = {
  width?: number;
  height?: number;
};

/**
 * Минималистичная линейная графика в духе референса: фигура с биноклем и звезда.
 */
export function OnboardingHeroIllustration({ width = 280, height = 210 }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Иллюстрация">
      <Svg width={width} height={height} viewBox="0 0 280 210">
        <Path
          d="M118 168 L132 168 L128 118 L142 118 L148 168 L162 168 L152 108 L128 108 Z"
          fill={colors.black}
        />
        <Path d="M108 108 L172 108 L172 118 L108 118 Z" fill={colors.black} />
        <Path
          d="M118 42 C118 28 128 18 142 18 C156 18 166 28 166 42 C166 52 160 60 152 64 L152 72 L132 72 L132 64 C124 60 118 52 118 42 Z"
          stroke={colors.black}
          strokeWidth="2.2"
          fill="none"
        />
        <Path
          d="M124 62 Q110 78 108 98"
          stroke={colors.black}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <Path d="M132 72 L132 108 M152 72 L152 108" stroke={colors.black} strokeWidth="2" />
        <Circle cx="118" cy="88" r="11" stroke={colors.black} strokeWidth="2.2" fill="none" />
        <Circle cx="166" cy="88" r="11" stroke={colors.black} strokeWidth="2.2" fill="none" />
        <Path d="M129 88 L155 88" stroke={colors.black} strokeWidth="2.5" />
        <Path d="M108 98 L98 108 L108 118" stroke={colors.black} strokeWidth="2" fill="none" />
        <Path d="M176 98 L186 108 L176 118" stroke={colors.black} strokeWidth="2" fill="none" />
        <Polygon
          points="228,52 234,62 246,60 240,70 248,78 236,76 232,88 226,78 214,78 222,70 216,60 228,62"
          stroke={colors.black}
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
