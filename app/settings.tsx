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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { useCourse } from "@/lib/CourseContext";
import { useAuth } from "@/lib/AuthContext";

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { course, setCourseInfo, resetCourse, addYear } = useCourse();
  const { user, logout } = useAuth();

  const [editingUni, setEditingUni] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [uniInput, setUniInput] = useState(course?.universityName || "");
  const [courseInput, setCourseInput] = useState(course?.courseTitle || "");

  if (!course) return null;

  const handleSaveUni = () => {
    if (uniInput.trim()) {
      setCourseInfo(uniInput.trim(), course.courseTitle);
    }
    setEditingUni(false);
  };

  const handleSaveCourse = () => {
    if (courseInput.trim()) {
      setCourseInfo(course.universityName, courseInput.trim());
    }
    setEditingCourse(false);
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Everything",
      "This will delete all your course data, modules, grades and goals. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetCourse();
            router.replace("/onboarding");
          },
        },
      ],
    );
  };

  const handleAddYear = () => {
    const nextNum = course.years.length + 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addYear(`Year ${nextNum}`, 0);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS !== "web" ? insets.top : 67) + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            COURSE DETAILS
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Pressable
              onPress={() => {
                setUniInput(course.universityName);
                setEditingUni(true);
              }}
              style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="school-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  University
                </Text>
              </View>
              {editingUni ? (
                <TextInput
                  style={[styles.settingInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  value={uniInput}
                  onChangeText={setUniInput}
                  autoFocus
                  onSubmitEditing={handleSaveUni}
                  onBlur={handleSaveUni}
                />
              ) : (
                <Text
                  style={[
                    styles.settingValue,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {course.universityName}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setCourseInput(course.courseTitle);
                setEditingCourse(true);
              }}
              style={styles.settingRow}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Course
                </Text>
              </View>
              {editingCourse ? (
                <TextInput
                  style={[styles.settingInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                  value={courseInput}
                  onChangeText={setCourseInput}
                  autoFocus
                  onSubmitEditing={handleSaveCourse}
                  onBlur={handleSaveCourse}
                />
              ) : (
                <Text
                  style={[
                    styles.settingValue,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {course.courseTitle}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACADEMIC YEARS
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            {course.years.map((year, index) => (
              <View
                key={year.id}
                style={[
                  styles.settingRow,
                  index < course.years.length - 1 && {
                    borderBottomColor: colors.borderLight,
                  },
                ]}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    {year.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.settingValue,
                    { color: colors.textSecondary },
                  ]}
                >
                  {year.weight}% weight · {year.modules.length} modules
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={handleAddYear}
            style={({ pressed }) => [
              styles.addYearButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addYearText, { color: colors.primary }]}>
              Add Year
            </Text>
          </Pressable>
        </View>

        {user && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ACCOUNT
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.borderLight },
              ]}
            >
              <View style={[styles.settingRow, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Name
                  </Text>
                </View>
                <Text
                  style={[styles.settingValue, { color: colors.textSecondary }]}
                >
                  {user.displayName}
                </Text>
              </View>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Email
                  </Text>
                </View>
                <Text
                  style={[styles.settingValue, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APP
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="moon-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Theme
                </Text>
              </View>
              <Text
                style={[
                  styles.settingValue,
                  { color: colors.textSecondary },
                ]}
              >
                {isDark ? "Dark" : "Light"} (System)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.dangerButton,
              {
                backgroundColor: isDark
                  ? "rgba(244,33,46,0.12)"
                  : "rgba(244,33,46,0.06)",
                borderColor: isDark
                  ? "rgba(244,33,46,0.25)"
                  : "rgba(244,33,46,0.15)",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.dangerText, { color: colors.danger }]}>
              Reset All Data
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            UniGrade v1.0
          </Text>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Built for UK universities
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  settingValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxWidth: "50%",
    textAlign: "right",
  },
  settingInput: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "50%",
    minWidth: 120,
  },
  addYearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    marginTop: 8,
  },
  addYearText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  dangerText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
