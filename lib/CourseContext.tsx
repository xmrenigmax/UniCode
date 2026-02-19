import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Course,
  type AcademicYear,
  type Module,
  type Assessment,
  generateId,
} from "./types";
import { saveCourse, loadCourse, deleteCourse } from "./storage";

interface CourseContextValue {
  course: Course | null;
  isLoading: boolean;
  setCourseInfo: (uni: string, title: string) => void;
  addYear: (label: string, weight: number) => void;
  updateYear: (yearId: string, updates: Partial<AcademicYear>) => void;
  removeYear: (yearId: string) => void;
  addModule: (yearId: string, name: string, credits: number) => void;
  updateModule: (yearId: string, moduleId: string, updates: Partial<Module>) => void;
  removeModule: (yearId: string, moduleId: string) => void;
  addAssessment: (yearId: string, moduleId: string, name: string, weight: number) => void;
  updateAssessment: (yearId: string, moduleId: string, assessmentId: string, updates: Partial<Assessment>) => void;
  removeAssessment: (yearId: string, moduleId: string, assessmentId: string) => void;
  setModuleTarget: (yearId: string, moduleId: string, target: number | null) => void;
  setYearTarget: (yearId: string, target: number | null) => void;
  setCourseTarget: (target: number | null) => void;
  resetCourse: () => void;
  createNewCourse: (uni: string, title: string, numYears: number) => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourse().then((c) => {
      setCourse(c);
      setIsLoading(false);
    });
  }, []);

  const persist = useCallback((updated: Course) => {
    setCourse(updated);
    saveCourse(updated);
  }, []);

  const createNewCourse = useCallback(
    (uni: string, title: string, numYears: number) => {
      const defaultWeights: Record<number, number[]> = {
        3: [0, 40, 60],
        4: [0, 20, 30, 50],
      };
      const weights = defaultWeights[numYears] || Array(numYears).fill(100 / numYears);

      const years: AcademicYear[] = Array.from({ length: numYears }, (_, i) => ({
        id: generateId(),
        label: `Year ${i + 1}`,
        yearNumber: i + 1,
        weight: weights[i],
        modules: [],
        targetGrade: null,
      }));

      const newCourse: Course = {
        id: generateId(),
        universityName: uni,
        courseTitle: title,
        years,
        targetGrade: null,
        createdAt: new Date().toISOString(),
      };
      persist(newCourse);
    },
    [persist],
  );

  const setCourseInfo = useCallback(
    (uni: string, title: string) => {
      if (!course) return;
      persist({ ...course, universityName: uni, courseTitle: title });
    },
    [course, persist],
  );

  const addYear = useCallback(
    (label: string, weight: number) => {
      if (!course) return;
      const newYear: AcademicYear = {
        id: generateId(),
        label,
        yearNumber: course.years.length + 1,
        weight,
        modules: [],
        targetGrade: null,
      };
      persist({ ...course, years: [...course.years, newYear] });
    },
    [course, persist],
  );

  const updateYear = useCallback(
    (yearId: string, updates: Partial<AcademicYear>) => {
      if (!course) return;
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId ? { ...y, ...updates } : y,
        ),
      });
    },
    [course, persist],
  );

  const removeYear = useCallback(
    (yearId: string) => {
      if (!course) return;
      persist({
        ...course,
        years: course.years.filter((y) => y.id !== yearId),
      });
    },
    [course, persist],
  );

  const addModule = useCallback(
    (yearId: string, name: string, credits: number) => {
      if (!course) return;
      const newModule: Module = {
        id: generateId(),
        name,
        credits,
        assessments: [],
        targetGrade: null,
      };
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId ? { ...y, modules: [...y.modules, newModule] } : y,
        ),
      });
    },
    [course, persist],
  );

  const updateModule = useCallback(
    (yearId: string, moduleId: string, updates: Partial<Module>) => {
      if (!course) return;
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId
            ? {
                ...y,
                modules: y.modules.map((m) =>
                  m.id === moduleId ? { ...m, ...updates } : m,
                ),
              }
            : y,
        ),
      });
    },
    [course, persist],
  );

  const removeModule = useCallback(
    (yearId: string, moduleId: string) => {
      if (!course) return;
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId
            ? { ...y, modules: y.modules.filter((m) => m.id !== moduleId) }
            : y,
        ),
      });
    },
    [course, persist],
  );

  const addAssessment = useCallback(
    (yearId: string, moduleId: string, name: string, weight: number) => {
      if (!course) return;
      const newAssessment: Assessment = {
        id: generateId(),
        name,
        weight,
        grade: null,
        completed: false,
      };
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId
            ? {
                ...y,
                modules: y.modules.map((m) =>
                  m.id === moduleId
                    ? { ...m, assessments: [...m.assessments, newAssessment] }
                    : m,
                ),
              }
            : y,
        ),
      });
    },
    [course, persist],
  );

  const updateAssessment = useCallback(
    (
      yearId: string,
      moduleId: string,
      assessmentId: string,
      updates: Partial<Assessment>,
    ) => {
      if (!course) return;
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId
            ? {
                ...y,
                modules: y.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        assessments: m.assessments.map((a) =>
                          a.id === assessmentId ? { ...a, ...updates } : a,
                        ),
                      }
                    : m,
                ),
              }
            : y,
        ),
      });
    },
    [course, persist],
  );

  const removeAssessment = useCallback(
    (yearId: string, moduleId: string, assessmentId: string) => {
      if (!course) return;
      persist({
        ...course,
        years: course.years.map((y) =>
          y.id === yearId
            ? {
                ...y,
                modules: y.modules.map((m) =>
                  m.id === moduleId
                    ? {
                        ...m,
                        assessments: m.assessments.filter(
                          (a) => a.id !== assessmentId,
                        ),
                      }
                    : m,
                ),
              }
            : y,
        ),
      });
    },
    [course, persist],
  );

  const setModuleTarget = useCallback(
    (yearId: string, moduleId: string, target: number | null) => {
      updateModule(yearId, moduleId, { targetGrade: target });
    },
    [updateModule],
  );

  const setYearTarget = useCallback(
    (yearId: string, target: number | null) => {
      updateYear(yearId, { targetGrade: target });
    },
    [updateYear],
  );

  const setCourseTarget = useCallback(
    (target: number | null) => {
      if (!course) return;
      persist({ ...course, targetGrade: target });
    },
    [course, persist],
  );

  const resetCourse = useCallback(() => {
    setCourse(null);
    deleteCourse();
  }, []);

  const value = useMemo(
    () => ({
      course,
      isLoading,
      setCourseInfo,
      addYear,
      updateYear,
      removeYear,
      addModule,
      updateModule,
      removeModule,
      addAssessment,
      updateAssessment,
      removeAssessment,
      setModuleTarget,
      setYearTarget,
      setCourseTarget,
      resetCourse,
      createNewCourse,
    }),
    [
      course,
      isLoading,
      setCourseInfo,
      addYear,
      updateYear,
      removeYear,
      addModule,
      updateModule,
      removeModule,
      addAssessment,
      updateAssessment,
      removeAssessment,
      setModuleTarget,
      setYearTarget,
      setCourseTarget,
      resetCourse,
      createNewCourse,
    ],
  );

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
}

export function useCourse() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourse must be used within a CourseProvider");
  }
  return context;
}
