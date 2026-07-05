import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>Ошибка запуска приложения</Text>
        <ScrollView style={styles.box} contentContainerStyle={styles.boxContent}>
          <Text style={styles.message}>{this.state.error.message}</Text>
          {this.state.error.stack ? <Text style={styles.stack}>{this.state.error.stack}</Text> : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.shell,
    padding: 18,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.black,
    marginBottom: 12,
  },
  box: {
    maxHeight: "75%",
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  boxContent: {
    padding: 16,
  },
  message: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B42318",
    marginBottom: 12,
  },
  stack: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.neutral500,
  },
});
