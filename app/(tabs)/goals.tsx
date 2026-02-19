import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { useCourse } from "@/lib/CourseContext";
import {
  calculateOverallGrade,
  calculateYearGrade,
  calculateModuleGrade,
  getClassification,
  getClassificationColor,
} from "@/lib/types";
import { GradeRing } from "@/components/GradeRing";
import { ProgressBar } from "@/components/ProgressBar";

const QUICK_TARGETS = [
  { label: "First", value: 70 },
  { label: "2:1", value: 60 },
  { label: "2:2", value: 50 },
  { label: "Third", value: 40 },
];

export default function GoalsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    course,
    setCourseTarget,
    setYearTarget,
    setModuleTarget,
  } = useCourse();
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [customTarget, setCustomTarget] = useState("");

  if (!course) return null;

  const overallGrade = calculateOverallGrade(course);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleSetTarget = (
    type: "course" | "year" | "module",
    value: number,
    yearId?: string,
    moduleId?: string,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === "course") {
      setCourseTarget(value);
    } else if (type === "year" && yearId) {
      setYearTarget(yearId, value);
    } else if (type === "module" && yearId && moduleId) {
      setModuleTarget(yearId, moduleId, value);
    }
    setEditingTarget(null);
    setCustomTarget("");
  };

  const handleClearTarget = (
    type: "course" | "year" | "module",
    yearId?: string,
    moduleId?: string,
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === "course") {
      setCourseTarget(null);
    } else if (type === "year" && yearId) {
      setYearTarget(yearId, null);
    } else if (type === "module" && yearId && moduleId) {
      setModuleTarget(yearId, moduleId, null);
    }
  };

  const handleCustomSubmit = (
    type: "course" | "year" | "module",
    yearId?: string,
    moduleId?: string,
  ) => {
    const val = parseInt(customTarget, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      Alert.alert("Invalid Grade", "Please enter a value between 0 and 100.");
      return;
    }
    handleSetTarget(type, val, yearId, moduleId);
  };

  const renderTargetSection = (
    key: string,
    label: string,
    current: number | null,
    target: number | null,
    type: "course" | "year" | "module",
    yearId?: string,
    moduleId?: string,
  ) => {
    const isEditing = editingTarget === key;
    const cls = getClassification(current);
    const clsColor = getClassificationColor(cls, isDark);
    const isOnTrack = current !== null && target !== null && current >= target;

    return (
      <View
        key={key}
        style={[
          styles.goalCard,
          { backgroundColor: colors.card, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalHeaderLeft}>
            <Text style={[styles.goalLabel, { color: colors.text }]}>
              {label}
            </Text>
            <Text style={[styles.goalCurrent, { color: clsColor }]}>
              {current !== null ? `${Math.round(current)}%` : "No grades yet"}
            </Text>
          </View>
          {target !== null ? (
            <View style={styles.targetDisplay}>
              <View
                style={[
                  styles.targetBadge,
                  {
                    backgroundColor: isOnTrack
                      ? "rgba(0,186,124,0.12)"
                      : "rgba(244,33,46,0.12)",
                  },
                ]}
              >
                <Ionicons
                  name={isOnTrack ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={isOnTrack ? colors.success : colors.danger}
                />
                <Text
                  style={[
                    styles.targetBadgeText,
                    { color: isOnTrack ? colors.success : colors.danger },
                  ]}
                >
                  {target}%
                </Text>
              </View>
              <Pressable
                onPress={() => handleClearTarget(type, yearId, moduleId)}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditingTarget(isEditing ? null : key);
                setCustomTarget("");
              }}
              style={({ pressed }) => [
                styles.setTargetButton,
                {
                  backgroundColor: isDark
                    ? "rgba(74,144,242,0.15)"
                    : "rgba(26,111,239,0.08)",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="flag-outline" size={14} color={colors.primary} />
              <Text
                style={[styles.setTargetText, { color: colors.primary }]}
              >
                Set Target
              </Text>
            </Pressable>
          )}
        </View>

        {target !== null && (
          <ProgressBar current={current} target={target} height={6} showPercentage={false} />
        )}

        {isEditing && (
          <View style={styles.quickTargets}>
            {QUICK_TARGETS.map((qt) => (
              <Pressable
                key={qt.value}
                onPress={() =>
                  handleSetTarget(type, qt.value, yearId, moduleId)
                }
                style={({ pressed }) => [
                  styles.quickTarget,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.quickTargetText, { color: colors.text }]}
                >
                  {qt.label}
                </Text>
                <Text
                  style={[
                    styles.quickTargetValue,
                    { color: colors.textSecondary },
                  ]}
                >
                  {qt.value}%
                </Text>
              </Pressable>
            ))}
            <View style={styles.customTargetRow}>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Custom %"
                placeholderTextColor={colors.textTertiary}
                value={customTarget}
                onChangeText={setCustomTarget}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Pressable
                onPress={() =>
                  handleCustomSubmit(type, yearId, moduleId)
                }
                style={({ pressed }) => [
                  styles.customSubmit,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: (Platform.OS !== "web" ? insets.top : webTopInset) + 16,
        paddingBottom: Platform.OS === "web" ? 34 : 100,
      }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Goals</Text>
      </View>

      <View style={styles.overviewCard}>
        <GradeRing
          grade={overallGrade}
          size={100}
          strokeWidth={8}
          showClassification
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Overall Target
        </Text>
        {renderTargetSection(
          "course",
          course.courseTitle,
          overallGrade,
          course.targetGrade,
          "course",
        )}
      </View>

      {course.years.map((year) => {
        const yearGrade = calculateYearGrade(year);

        return (
          <View key={year.id} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {year.label}
            </Text>
            {renderTargetSection(
              `year-${year.id}`,
              `${year.label} Average`,
              yearGrade,
              year.targetGrade,
              "year",
              year.id,
            )}
            {year.modules.map((mod) => {
              const modGrade = calculateModuleGrade(mod);
              return renderTargetSection(
                `mod-${mod.id}`,
                mod.name,
                modGrade,
                mod.targetGrade,
                "module",
                year.id,
                mod.id,
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  overviewCard: {
    alignItems: "center",
    paddingVertical: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  goalLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  goalCurrent: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  targetDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  targetBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  setTargetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  setTargetText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  quickTargets: {
    gap: 8,
  },
  quickTarget: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickTargetText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  quickTargetValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  customTargetRow: {
    flexDirection: "row",
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  customSubmit: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
