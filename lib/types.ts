export interface Assessment {
  id: string;
  name: string;
  weight: number;
  grade: number | null;
  completed: boolean;
}

export interface Module {
  id: string;
  name: string;
  credits: number;
  assessments: Assessment[];
  targetGrade: number | null;
}

export interface AcademicYear {
  id: string;
  label: string;
  yearNumber: number;
  weight: number;
  modules: Module[];
  targetGrade: number | null;
}

export interface Course {
  id: string;
  universityName: string;
  courseTitle: string;
  years: AcademicYear[];
  targetGrade: number | null;
  createdAt: string;
}

export type GradeClassification =
  | "First"
  | "2:1"
  | "2:2"
  | "Third"
  | "Fail"
  | "N/A";

export function getClassification(grade: number | null): GradeClassification {
  if (grade === null) return "N/A";
  if (grade >= 70) return "First";
  if (grade >= 60) return "2:1";
  if (grade >= 50) return "2:2";
  if (grade >= 40) return "Third";
  return "Fail";
}

export function getClassificationColor(
  classification: GradeClassification,
  isDark: boolean,
): string {
  switch (classification) {
    case "First":
      return "#00BA7C";
    case "2:1":
      return "#4A90F2";
    case "2:2":
      return "#FFB800";
    case "Third":
      return "#FF6B35";
    case "Fail":
      return "#F4212E";
    default:
      return isDark ? "#536471" : "#8899A6";
  }
}

export function calculateModuleGrade(module: Module): number | null {
  const completedAssessments = module.assessments.filter(
    (a) => a.completed && a.grade !== null,
  );
  if (completedAssessments.length === 0) return null;

  const totalWeight = completedAssessments.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight === 0) return null;

  const weightedSum = completedAssessments.reduce(
    (sum, a) => sum + (a.grade! * a.weight) / 100,
    0,
  );

  return (weightedSum / totalWeight) * 100;
}

export function calculateYearGrade(year: AcademicYear): number | null {
  const modulesWithGrades = year.modules
    .map((m) => ({ grade: calculateModuleGrade(m), credits: m.credits }))
    .filter((m) => m.grade !== null);

  if (modulesWithGrades.length === 0) return null;

  const totalCredits = modulesWithGrades.reduce((sum, m) => sum + m.credits, 0);
  if (totalCredits === 0) return null;

  const weightedSum = modulesWithGrades.reduce(
    (sum, m) => sum + m.grade! * m.credits,
    0,
  );

  return weightedSum / totalCredits;
}

export function calculateOverallGrade(course: Course): number | null {
  const yearsWithGrades = course.years
    .map((y) => ({ grade: calculateYearGrade(y), weight: y.weight }))
    .filter((y) => y.grade !== null);

  if (yearsWithGrades.length === 0) return null;

  const totalWeight = yearsWithGrades.reduce((sum, y) => sum + y.weight, 0);
  if (totalWeight === 0) return null;

  const weightedSum = yearsWithGrades.reduce(
    (sum, y) => sum + y.grade! * y.weight,
    0,
  );

  return weightedSum / totalWeight;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function getCompletionPercentage(course: Course): number {
  let total = 0;
  let completed = 0;
  course.years.forEach((y) => {
    y.modules.forEach((m) => {
      m.assessments.forEach((a) => {
        total++;
        if (a.completed) completed++;
      });
    });
  });
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
