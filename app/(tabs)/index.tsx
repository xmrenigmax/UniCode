import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/lib/useTheme";
import { useCourse } from "@/lib/CourseContext";
import {
  calculateOverallGrade,
  calculateYearGrade,
  calculateModuleGrade,
  getClassification,
  getClassificationColor,
  getCompletionPercentage,
} from "@/lib/types";
import { GradeRing } from "@/components/GradeRing";
import { ProgressBar } from "@/components/ProgressBar";

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { course } = useCourse();

  if (!course) return null;

  const overallGrade = calculateOverallGrade(course);
  const completion = getCompletionPercentage(course);
  const classification = getClassification(overallGrade);

  const totalModules = course.years.reduce(
    (sum, y) => sum + y.modules.length,
    0,
  );
  const totalAssessments = course.years.reduce(
    (sum, y) =>
      sum + y.modules.reduce((s, m) => s + m.assessments.length, 0),
    0,
  );
  const completedAssessments = course.years.reduce(
    (sum, y) =>
      sum +
      y.modules.reduce(
        (s, m) => s + m.assessments.filter((a) => a.completed).length,
        0,
      ),
    0,
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 100 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: (Platform.OS !== "web" ? insets.top : webTopInset) + 16 },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerUni}>{course.universityName}</Text>
            <Text style={styles.headerCourse}>{course.courseTitle}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            style={({ pressed }) => [
              styles.settingsButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.gradeRingContainer}>
          <GradeRing
            grade={overallGrade}
            size={160}
            strokeWidth={10}
            label="Overall"
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalModules}</Text>
            <Text style={styles.statLabel}>Modules</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {completedAssessments}/{totalAssessments}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{completion}%</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>
      </LinearGradient>

      {course.targetGrade !== null && (
        <View style={[styles.section, { marginTop: 20 }]}>
          <View
            style={[
              styles.targetCard,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.targetRow}>
              <Ionicons name="flag" size={18} color={colors.primary} />
              <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
                Target: {course.targetGrade}% ({getClassification(course.targetGrade)})
              </Text>
            </View>
            <ProgressBar
              current={overallGrade}
              target={course.targetGrade}
              height={6}
              showPercentage={false}
            />
            <Text style={[styles.targetStatus, { color: colors.textTertiary }]}>
              {overallGrade !== null
                ? overallGrade >= course.targetGrade
                  ? "On track to meet your goal"
                  : `${Math.round(course.targetGrade - overallGrade)}% below target`
                : "Add grades to track progress"}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Year Breakdown
        </Text>
        {course.years.map((year) => {
          const yearGrade = calculateYearGrade(year);
          const yearClassification = getClassification(yearGrade);
          const yearColor = getClassificationColor(yearClassification, isDark);

          return (
            <Pressable
              key={year.id}
              onPress={() =>
                router.push({
                  pathname: "/year/[id]",
                  params: { id: year.id },
                })
              }
              style={({ pressed }) => [
                styles.yearCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  opacity: pressed ? 0.95 : 1,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
              ]}
            >
              <View style={styles.yearCardHeader}>
                <View style={styles.yearInfo}>
                  <Text style={[styles.yearLabel, { color: colors.text }]}>
                    {year.label}
                  </Text>
                  <Text
                    style={[
                      styles.yearWeight,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {year.weight}% weighting
                  </Text>
                </View>
                <View style={styles.yearGradeContainer}>
                  <Text
                    style={[
                      styles.yearGrade,
                      { color: yearGrade !== null ? yearColor : colors.textTertiary },
                    ]}
                  >
                    {yearGrade !== null ? `${Math.round(yearGrade)}%` : "--"}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                </View>
              </View>
              <ProgressBar
                current={yearGrade}
                target={year.targetGrade}
                height={4}
                showPercentage={false}
              />
              <Text
                style={[styles.moduleCount, { color: colors.textTertiary }]}
              >
                {year.modules.length} module{year.modules.length !== 1 ? "s" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {course.years.some((y) => y.modules.length > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Modules
          </Text>
          {course.years
            .flatMap((y) =>
              y.modules.map((m) => ({
                ...m,
                yearId: y.id,
                yearLabel: y.label,
              })),
            )
            .slice(0, 5)
            .map((mod) => {
              const grade = calculateModuleGrade(mod);
              const cls = getClassification(grade);
              const clsColor = getClassificationColor(cls, isDark);

              return (
                <Pressable
                  key={mod.id}
                  onPress={() =>
                    router.push({
                      pathname: "/module/[yearId]/[moduleId]",
                      params: { yearId: mod.yearId, moduleId: mod.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.moduleCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.borderLight,
                      opacity: pressed ? 0.95 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.moduleGradeDot,
                      { backgroundColor: clsColor },
                    ]}
                  />
                  <View style={styles.moduleInfo}>
                    <Text
                      style={[styles.moduleName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {mod.name}
                    </Text>
                    <Text
                      style={[
                        styles.moduleSubtext,
                        { color: colors.textTertiary },
                      ]}
                    >
                      {mod.yearLabel} · {mod.credits} credits · {mod.assessments.length} assessment{mod.assessments.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <Text style={[styles.moduleGradeText, { color: clsColor }]}>
                    {grade !== null ? `${Math.round(grade)}%` : "--"}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerUni: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  headerCourse: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  gradeRingContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  targetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  targetLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  targetStatus: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  yearCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  yearCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearInfo: {
    flex: 1,
  },
  yearLabel: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  yearWeight: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  yearGradeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  yearGrade: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  moduleCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  moduleGradeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  moduleSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  moduleGradeText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
