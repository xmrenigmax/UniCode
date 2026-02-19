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
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/lib/useTheme";
import { useCourse } from "@/lib/CourseContext";
import {
  calculateModuleGrade,
  calculateYearGrade,
  getClassification,
  getClassificationColor,
} from "@/lib/types";
import { GradeRing } from "@/components/GradeRing";

export default function YearDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { course, addModule, removeModule, updateYear } = useCourse();

  const [showAddModule, setShowAddModule] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [moduleCredits, setModuleCredits] = useState("20");
  const [editingWeight, setEditingWeight] = useState(false);
  const [yearWeightText, setYearWeightText] = useState("");

  if (!course) return null;
  const year = course.years.find((y) => y.id === id);
  if (!year) return null;

  const yearGrade = calculateYearGrade(year);
  const totalCredits = year.modules.reduce((sum, m) => sum + m.credits, 0);

  const handleAddModule = () => {
    if (!moduleName.trim()) return;
    const credits = parseInt(moduleCredits, 10) || 20;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addModule(year.id, moduleName.trim(), credits);
    setModuleName("");
    setModuleCredits("20");
    setShowAddModule(false);
  };

  const handleDeleteModule = (moduleId: string, name: string) => {
    Alert.alert("Delete Module", `Remove "${name}" and all its assessments?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeModule(year.id, moduleId);
        },
      },
    ]);
  };

  const handleSaveWeight = () => {
    const val = parseInt(yearWeightText, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      Alert.alert("Invalid Weight", "Enter a value between 0 and 100.");
      return;
    }
    updateYear(year.id, { weight: val });
    setEditingWeight(false);
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
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {year.label}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddModule(true);
          }}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gradeSection}>
          <GradeRing grade={yearGrade} size={120} strokeWidth={8} />
          <View style={styles.yearStats}>
            <View style={styles.yearStatItem}>
              <Text style={[styles.yearStatValue, { color: colors.text }]}>
                {year.modules.length}
              </Text>
              <Text
                style={[
                  styles.yearStatLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Modules
              </Text>
            </View>
            <View style={styles.yearStatItem}>
              <Text style={[styles.yearStatValue, { color: colors.text }]}>
                {totalCredits}
              </Text>
              <Text
                style={[
                  styles.yearStatLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Credits
              </Text>
            </View>
            <Pressable
              style={styles.yearStatItem}
              onPress={() => {
                setEditingWeight(true);
                setYearWeightText(String(year.weight));
              }}
            >
              <Text style={[styles.yearStatValue, { color: colors.primary }]}>
                {year.weight}%
              </Text>
              <Text
                style={[
                  styles.yearStatLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Weight
              </Text>
            </Pressable>
          </View>
        </View>

        {editingWeight && (
          <View style={[styles.editWeightCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[styles.editWeightLabel, { color: colors.textSecondary }]}>
              Year Weight (%)
            </Text>
            <View style={styles.editWeightRow}>
              <TextInput
                style={[styles.editWeightInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                value={yearWeightText}
                onChangeText={setYearWeightText}
                keyboardType="number-pad"
                autoFocus
                maxLength={3}
              />
              <Pressable
                onPress={handleSaveWeight}
                style={({ pressed }) => [styles.editWeightSave, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setEditingWeight(false)}
                style={({ pressed }) => [styles.editWeightCancel, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="close" size={18} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>
        )}

        {showAddModule && (
          <View
            style={[
              styles.addModuleCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.addModuleTitle, { color: colors.text }]}>
              Add Module
            </Text>
            <TextInput
              style={[
                styles.addInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Module name"
              placeholderTextColor={colors.textTertiary}
              value={moduleName}
              onChangeText={setModuleName}
              autoFocus
            />
            <TextInput
              style={[
                styles.addInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Credits (default: 20)"
              placeholderTextColor={colors.textTertiary}
              value={moduleCredits}
              onChangeText={setModuleCredits}
              keyboardType="number-pad"
            />
            <View style={styles.addModuleActions}>
              <Pressable
                onPress={() => setShowAddModule(false)}
                style={({ pressed }) => [
                  styles.cancelButton,
                  {
                    backgroundColor: colors.inputBackground,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddModule}
                disabled={!moduleName.trim()}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: moduleName.trim()
                      ? colors.primary
                      : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.modulesList}>
          {year.modules.length === 0 && !showAddModule ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.borderLight },
              ]}
            >
              <Ionicons
                name="library-outline"
                size={40}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No modules added
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: colors.textTertiary },
                ]}
              >
                Add your modules to start tracking grades
              </Text>
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: "/module/[yearId]/[moduleId]",
                      params: { yearId: year.id, moduleId: mod.id },
                    });
                  }}
                  onLongPress={() =>
                    handleDeleteModule(mod.id, mod.name)
                  }
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
                        style={[styles.moduleName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {mod.name}
                      </Text>
                      <Text
                        style={[styles.moduleGrade, { color: clsColor }]}
                      >
                        {grade !== null ? `${Math.round(grade)}%` : "--"}
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
                        {completedCount}/{mod.assessments.length} assessments
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textTertiary}
                  />
                </Pressable>
              );
            })
          )}
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
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  gradeSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 24,
  },
  yearStats: {
    gap: 12,
  },
  yearStatItem: {
    alignItems: "center",
  },
  yearStatValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  yearStatLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  editWeightCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  editWeightLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  editWeightRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  editWeightInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  editWeightSave: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  editWeightCancel: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  addModuleCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  addModuleTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  addInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  addModuleActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modulesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  moduleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  moduleAccent: {
    width: 4,
    alignSelf: "stretch",
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
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  moduleBottom: {
    flexDirection: "row",
    gap: 12,
  },
  moduleDetail: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
