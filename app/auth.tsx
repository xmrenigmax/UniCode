import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { useAuth } from "@/lib/AuthContext";

type AuthMode = "login" | "register";

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const switchMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError("");
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => {
      setMode(mode === "login" ? "register" : "login");
    }, 150);
  };

  const handleSubmit = async () => {
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (mode === "register" && !displayName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim());
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      if (msg.includes("409")) {
        setError("This email is already registered");
      } else if (msg.includes("401")) {
        setError("Invalid email or password");
      } else if (msg.includes("400")) {
        const cleaned = msg.replace(/^\d+:\s*/, "");
        try {
          const parsed = JSON.parse(cleaned);
          setError(parsed.message || "Validation failed");
        } catch {
          if (cleaned.includes("uppercase")) {
            setError("Password must contain at least one uppercase letter");
          } else if (cleaned.includes("number")) {
            setError("Password must contain at least one number");
          } else if (cleaned.includes("8 characters")) {
            setError("Password must be at least 8 characters");
          } else {
            setError("Please check your details and try again");
          }
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    mode === "login"
      ? email.trim() && password.trim()
      : email.trim() && password.trim() && displayName.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 40 }]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={36} color={colors.primary} />
          </View>
          <Text style={styles.logoText}>UniGrade</Text>
          <Text style={styles.logoSubtext}>Track your academic journey</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.formContainer,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.formContent, { opacity: fadeAnim }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text
              style={[styles.formSubtitle, { color: colors.textSecondary }]}
            >
              {mode === "login"
                ? "Sign in to access your grades"
                : "Start tracking your university grades"}
            </Text>

            {error ? (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: isDark ? "#3D1518" : "#FFF0F0" },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={colors.danger}
                />
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {mode === "register" && (
              <View style={styles.inputWrapper}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Full Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.textTertiary}
                  />
                  <TextInput
                    ref={nameRef}
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Your name"
                    placeholderTextColor={colors.textTertiary}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    testID="name-input"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    mode === "register"
                      ? nameRef.current?.focus()
                      : passwordRef.current?.focus()
                  }
                  testID="email-input"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text
                style={[styles.inputLabel, { color: colors.textSecondary }]}
              >
                Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textTertiary}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder={
                    mode === "register"
                      ? "Min 8 chars, 1 uppercase, 1 number"
                      : "Enter your password"
                  }
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  testID="password-input"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || loading}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor:
                    isValid && !loading ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              testID="submit-button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {mode === "login" ? "Sign In" : "Create Account"}
                  </Text>
                  <Ionicons
                    name={
                      mode === "login" ? "log-in-outline" : "person-add-outline"
                    }
                    size={20}
                    color="#fff"
                  />
                </>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text
                style={[styles.switchText, { color: colors.textSecondary }]}
              >
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </Text>
              <Pressable onPress={switchMode}>
                <Text style={[styles.switchLink, { color: colors.primary }]}>
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </Pressable>
            </View>

            {mode === "register" && (
              <View
                style={[
                  styles.securityNote,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={colors.success}
                />
                <Text
                  style={[
                    styles.securityText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Your password is encrypted with industry-standard bcrypt
                  hashing. We never store plain text passwords.
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  headerGradient: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    gap: 10,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  logoSubtext: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  formContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  formContent: {
    gap: 16,
  },
  formTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  formSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  inputWrapper: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  switchText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  switchLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
