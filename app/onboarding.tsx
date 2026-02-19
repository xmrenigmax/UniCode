import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { useCourse } from "@/lib/CourseContext";

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { createNewCourse } = useCourse();

  const [step, setStep] = useState(0);
  const [university, setUniversity] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [numYears, setNumYears] = useState(3);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 0 && university.trim()) {
      setStep(1);
    } else if (step === 1 && courseTitle.trim()) {
      setStep(2);
    }
  };

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createNewCourse(university.trim(), courseTitle.trim(), numYears);
    router.replace("/(tabs)");
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(step - 1);
  };

  const yearOptions = [3, 4];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          {step > 0 && (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
          )}
          <View style={styles.stepIndicatorRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      i <= step ? "#fff" : "rgba(255,255,255,0.3)",
                    width: i === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
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
            styles.content,
            { paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <View style={styles.stepContent}>
              <Ionicons
                name="school-outline"
                size={48}
                color={colors.primary}
              />
              <Text style={[styles.title, { color: colors.text }]}>
                Your University
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Which university are you studying at?
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
                  name="search"
                  size={20}
                  color={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. University of Manchester"
                  placeholderTextColor={colors.textTertiary}
                  value={university}
                  onChangeText={setUniversity}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </View>
              <Pressable
                onPress={handleNext}
                disabled={!university.trim()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: university.trim()
                      ? colors.primary
                      : colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          )}

          {step === 1 && (
            <View style={styles.stepContent}>
              <Ionicons
                name="book-outline"
                size={48}
                color={colors.primary}
              />
              <Text style={[styles.title, { color: colors.text }]}>
                Your Course
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                What degree are you studying?
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
                  name="document-text-outline"
                  size={20}
                  color={colors.textTertiary}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. BSc Computer Science"
                  placeholderTextColor={colors.textTertiary}
                  value={courseTitle}
                  onChangeText={setCourseTitle}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={handleNext}
                />
              </View>
              <Pressable
                onPress={handleNext}
                disabled={!courseTitle.trim()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: courseTitle.trim()
                      ? colors.primary
                      : colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={colors.primary}
              />
              <Text style={[styles.title, { color: colors.text }]}>
                Course Duration
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                How many years is your degree?
              </Text>
              <View style={styles.yearOptions}>
                {yearOptions.map((y) => (
                  <Pressable
                    key={y}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNumYears(y);
                    }}
                    style={({ pressed }) => [
                      styles.yearOption,
                      {
                        backgroundColor:
                          numYears === y
                            ? colors.primary
                            : colors.inputBackground,
                        borderColor:
                          numYears === y ? colors.primary : colors.border,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearNumber,
                        { color: numYears === y ? "#fff" : colors.text },
                      ]}
                    >
                      {y}
                    </Text>
                    <Text
                      style={[
                        styles.yearLabel,
                        {
                          color:
                            numYears === y
                              ? "rgba(255,255,255,0.8)"
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      years
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {numYears === 3
                    ? "Year 1: 0%, Year 2: 40%, Year 3: 60% weighting"
                    : "Year 1: 0%, Year 2: 20%, Year 3: 30%, Year 4: 50% weighting"}
                </Text>
              </View>
              <Pressable
                onPress={handleCreate}
                style={({ pressed }) => [
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  backButton: {
    position: "absolute",
    left: 0,
    padding: 4,
  },
  stepIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stepContent: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    width: "100%",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  yearOptions: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 8,
  },
  yearOption: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  yearNumber: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  yearLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
