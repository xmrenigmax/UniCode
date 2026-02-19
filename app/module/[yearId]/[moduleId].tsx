import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Switch,
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
  getClassification,
  getClassificationColor,
} from "@/lib/types";
import { GradeRing } from "@/components/GradeRing";

export default function ModuleDetailScreen() {
  const { yearId, moduleId } = useLocalSearchParams<{
    yearId: string;
    moduleId: string;
  }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    course,
    addAssessment,
    updateAssessment,
    removeAssessment,
    updateModule,
  } = useCourse();

  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentWeight, setAssessmentWeight] = useState("");
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState("");
  const [editingModuleName, setEditingModuleName] = useState(false);
  const [moduleNameInput, setModuleNameInput] = useState("");

  if (!course) return null;
  const year = course.years.find((y) => y.id === yearId);
  if (!year) return null;
  const mod = year.modules.find((m) => m.id === moduleId);
  if (!mod) return null;

  const moduleGrade = calculateModuleGrade(mod);
  const cls = getClassification(moduleGrade);
  const clsColor = getClassificationColor(cls, isDark);
  const totalWeight = mod.assessments.reduce((sum, a) => sum + a.weight, 0);
  const remainingWeight = 100 - totalWeight;

  const handleAddAssessment = () => {
    if (!assessmentName.trim()) return;
    const weight = parseFloat(assessmentWeight) || 0;
    if (weight <= 0 || weight > 100) {
      Alert.alert("Invalid Weight", "Weight must be between 0 and 100.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addAssessment(yearId!, moduleId!, assessmentName.trim(), weight);
    setAssessmentName("");
    setAssessmentWeight("");
    setShowAddAssessment(false);
  };

  const handleSetGrade = (assessmentId: string) => {
    const val = parseFloat(gradeInput);
    if (isNaN(val) || val < 0 || val > 100) {
      Alert.alert("Invalid Grade", "Enter a value between 0 and 100.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAssessment(yearId!, moduleId!, assessmentId, {
      grade: val,
      completed: true,
    });
    setEditingGrade(null);
    setGradeInput("");
  };

  const handleDeleteAssessment = (assessmentId: string, name: string) => {
    Alert.alert("Delete Assessment", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeAssessment(yearId!, moduleId!, assessmentId);
        },
      },
    ]);
  };

  const handleSaveModuleName = () => {
    if (moduleNameInput.trim()) {
      updateModule(yearId!, moduleId!, { name: moduleNameInput.trim() });
    }
    setEditingModuleName(false);
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
        {editingModuleName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={[styles.editNameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={moduleNameInput}
              onChangeText={setModuleNameInput}
              autoFocus
              onSubmitEditing={handleSaveModuleName}
              onBlur={handleSaveModuleName}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setModuleNameInput(mod.name);
              setEditingModuleName(true);
            }}
            style={styles.headerTitleContainer}
          >
            <Text
              style={[styles.headerTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {mod.name}
            </Text>
            <Ionicons name="pencil" size={14} color={colors.textTertiary} />
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddAssessment(true);
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
          <GradeRing
            grade={moduleGrade}
            size={130}
            strokeWidth={10}
            showClassification
          />
        </View>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {mod.credits}
            </Text>
            <Text
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              Credits
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {mod.assessments.filter((a) => a.completed).length}/
              {mod.assessments.length}
            </Text>
            <Text
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              Completed
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    remainingWeight === 0
                      ? colors.success
                      : remainingWeight < 0
                        ? colors.danger
                        : colors.warning,
                },
              ]}
            >
              {remainingWeight}%
            </Text>
            <Text
              style={[styles.statLabel, { color: colors.textSecondary }]}
            >
              Remaining
            </Text>
          </View>
        </View>

        {showAddAssessment && (
          <View
            style={[
              styles.addCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.addCardTitle, { color: colors.text }]}>
              Add Assessment
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
              placeholder="Assessment name (e.g. Coursework 1)"
              placeholderTextColor={colors.textTertiary}
              value={assessmentName}
              onChangeText={setAssessmentName}
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
              placeholder={`Weight % (${remainingWeight}% remaining)`}
              placeholderTextColor={colors.textTertiary}
              value={assessmentWeight}
              onChangeText={setAssessmentWeight}
              keyboardType="decimal-pad"
            />
            <View style={styles.addActions}>
              <Pressable
                onPress={() => setShowAddAssessment(false)}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.inputBackground,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddAssessment}
                disabled={!assessmentName.trim()}
                style={({ pressed }) => [
                  styles.saveBtn,
                  {
                    backgroundColor: assessmentName.trim()
                      ? colors.primary
                      : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.assessmentsList}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Assessments
          </Text>
          {mod.assessments.length === 0 && !showAddAssessment ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.borderLight },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={36}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No assessments yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  { color: colors.textTertiary },
                ]}
              >
                Add coursework, exams, or presentations
              </Text>
            </View>
          ) : (
            mod.assessments.map((assessment) => {
              const aGrade = assessment.grade;
              const aCls = getClassification(aGrade);
              const aColor = getClassificationColor(aCls, isDark);
              const isEditingThis = editingGrade === assessment.id;

              return (
                <Pressable
                  key={assessment.id}
                  onLongPress={() =>
                    handleDeleteAssessment(assessment.id, assessment.name)
                  }
                  style={[
                    styles.assessmentCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <View style={styles.assessmentTop}>
                    <View style={styles.assessmentInfo}>
                      <Text
                        style={[
                          styles.assessmentName,
                          { color: colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {assessment.name}
                      </Text>
                      <Text
                        style={[
                          styles.assessmentWeight,
                          { color: colors.textTertiary },
                        ]}
                      >
                        {assessment.weight}% weight
                      </Text>
                    </View>
                    <View style={styles.assessmentRight}>
                      {assessment.completed && aGrade !== null ? (
                        <Pressable
                          onPress={() => {
                            setEditingGrade(assessment.id);
                            setGradeInput(String(aGrade));
                          }}
                        >
                          <Text
                            style={[
                              styles.assessmentGrade,
                              { color: aColor },
                            ]}
                          >
                            {Math.round(aGrade)}%
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => {
                            setEditingGrade(assessment.id);
                            setGradeInput("");
                          }}
                          style={({ pressed }) => [
                            styles.enterGradeBtn,
                            {
                              backgroundColor: isDark
                                ? "rgba(74,144,242,0.15)"
                                : "rgba(26,111,239,0.08)",
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.enterGradeText,
                              { color: colors.primary },
                            ]}
                          >
                            Enter Grade
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {isEditingThis && (
                    <View style={styles.gradeInputRow}>
                      <TextInput
                        style={[
                          styles.gradeInput,
                          {
                            backgroundColor: colors.inputBackground,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        placeholder="Grade %"
                        placeholderTextColor={colors.textTertiary}
                        value={gradeInput}
                        onChangeText={setGradeInput}
                        keyboardType="decimal-pad"
                        autoFocus
                        onSubmitEditing={() =>
                          handleSetGrade(assessment.id)
                        }
                      />
                      <Pressable
                        onPress={() => handleSetGrade(assessment.id)}
                        style={({ pressed }) => [
                          styles.gradeSubmit,
                          {
                            backgroundColor: colors.primary,
                            opacity: pressed ? 0.9 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#fff"
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditingGrade(null);
                          setGradeInput("");
                        }}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="close"
                          size={20}
                          color={colors.textTertiary}
                        />
                      </Pressable>
                    </View>
                  )}
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
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 12,
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    maxWidth: "80%",
  },
  editNameRow: {
    flex: 1,
    marginHorizontal: 12,
  },
  editNameInput: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gradeSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  addCardTitle: {
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
  addActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  assessmentsList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
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
  assessmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  assessmentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assessmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  assessmentName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  assessmentWeight: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  assessmentRight: {
    alignItems: "flex-end",
  },
  assessmentGrade: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  enterGradeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  enterGradeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  gradeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gradeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  gradeSubmit: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
