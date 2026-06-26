import React, { type ReactNode } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

export function KeyboardRoot({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
