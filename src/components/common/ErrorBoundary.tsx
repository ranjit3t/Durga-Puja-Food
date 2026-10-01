import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../strings";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application exception:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#C41E3A" />
            </View>
            <Text style={styles.title}>{UI_TEXT.appName}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.syncError || "System Error Occurred"}</Text>
            {this.state.error?.message ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={4}>
                  {this.state.error.message}
                </Text>
              </View>
            ) : null}
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>{UI_TEXT.ok || "Try Again"}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(196, 30, 58, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 16,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 12,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  errorText: {
    color: "#F87171",
    fontSize: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C41E3A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
