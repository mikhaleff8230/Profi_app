import React, { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View, type ViewProps } from "react-native";

type StickyProps = ViewProps & {
  children: ReactNode;
  offset?: { closed?: number; opened?: number };
};

export function KeyboardStickyView({ children, offset: _offset, ...props }: StickyProps) {
  return <View {...props}>{children}</View>;
}

export { KeyboardAvoidingView, Platform };
