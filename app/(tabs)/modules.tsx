import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/lib/useTheme";
import { useCourse } from "@/lib/CourseContext";
import {
  calculateModuleGrade,
  calculateYearGrade,
  getClassification,
  getClassificationColor,
} from "@/lib/types";

export default function ModulesScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { course } = useCourse();
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  if (!course) return null;

  const webTopInset = Platform.OS === "web" ? 67 : 0;

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
        <Text style={[styles.title, { color: colors.text }]}>Modules</Text>
      </View>

      {course.years.map((year) => {
        const isExpanded = expandedYear === year.id || expandedYear === null;
        const yearGrade = calculateYearGrade(year);
        const yearCls = getClassification(yearGrade);
        const yearColor = getClassificationColor(yearCls, isDark);

        return (
          <View key={year.id} style={styles.yearSection}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedYear(
                  expandedYear === year.id ? null : year.id,
                );
              }}
              style={({ pressed }) => [
                styles.yearHeader,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  opacity: pressed ? 0.95 : 1,
                },
              ]}
            >
              <View style={styles.yearHeaderLeft}>
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color={colors.textTertiary}
                />
                <View>
                  <Text
                    style={[styles.yearTitle, { color: colors.text }]}
                  >
                    {year.label}
                  </Text>
                  <Text
                    style={[
                      styles.yearSubtitle,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {year.modules.length} module{year.modules.length !== 1 ? "s" : ""} · {year.weight}% weight
                  </Text>
                </View>
              </View>
              <View style={styles.yearHeaderRight}>
                <Text style={[styles.yearGradeText, { color: yearColor }]}>
                  {yearGrade !== null
                    ? `${Math.round(yearGrade)}%`
                    : "--"}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: "/year/[id]",
                      params: { id: year.id },
                    });
                  }}
                  hitSlop={8}
                >
                  <Ionicons
                    name="add-circle"
                    size={28}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
            </Pressable>

            {isExpanded && (
              <View style={styles.modulesList}>
                {year.modules.length === 0 ? (
                  <View
                    style={[
                      styles.emptyState,
                      { backgroundColor: colors.card, borderColor: colors.borderLight },
                    ]}
                  >
                    <Ionicons
                      name="library-outline"
                      size={32}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colors.textTertiary },
                      ]}
                    >
                      No modules yet
                    </Text>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/year/[id]",
                          params: { id: year.id },
                        });
                      }}
                      style={({ pressed }) => [
                        styles.addButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={styles.addButtonText}>Add Module</Text>
                    </Pressable>
                  </View>
                ) : (
                  year.modules.map((mod) => {
                    const grade = calculateModuleGrade(mod);
                    const cls = getClassification(grade);
                    const clsColor = getClassificationColor(cls, isDark);
                    const completedCount = mod.assessments.filter(
                      (a) => a.completed,
                    ).length;

                    return (
                      <Pressable
                        key={mod.id}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          );
                          router.push({
                            pathname: "/module/[yearId]/[moduleId]",
                            params: { yearId: year.id, moduleId: mod.id },
                          });
                        }}
                        style={({ pressed }) => [
                          styles.moduleCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.borderLight,
                            opacity: pressed ? 0.95 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.moduleAccent,
                            { backgroundColor: clsColor },
                          ]}
                        />
                        <View style={styles.moduleContent}>
                          <View style={styles.moduleTop}>
                            <Text
                              style={[
                                styles.moduleName,
                                { color: colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {mod.name}
                            </Text>
                            <Text
                              style={[
                                styles.moduleGrade,
                                { color: clsColor },
                              ]}
                            >
                              {grade !== null
                                ? `${Math.round(grade)}%`
                                : "--"}
                            </Text>
                          </View>
                          <View style={styles.moduleBottom}>
                            <Text
                              style={[
                                styles.moduleDetail,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {mod.credits} credits
                            </Text>
                            <Text
                              style={[
                                styles.moduleDetail,
                                { color: colors.textTertiary },
                              ]}
                            >
                              {completedCount}/{mod.assessments.length} done
                            </Text>
                            {mod.targetGrade !== null && (
                              <View style={styles.targetBadge}>
                                <Ionicons
                                  name="flag"
                                  size={10}
                                  color={colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.targetBadgeText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {mod.targetGrade}%
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
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
  yearSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  yearHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  yearHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  yearTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  yearSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  yearHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  yearGradeText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  modulesList: {
    marginTop: 8,
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 4,
    marginTop: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  moduleCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  moduleAccent: {
    width: 4,
  },
  moduleContent: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  moduleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moduleName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  moduleGrade: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  moduleBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moduleDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  targetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  targetBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
