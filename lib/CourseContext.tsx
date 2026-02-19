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
} from "./types";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";
import { useAuth } from "@/lib/AuthContext";
import { fetch } from "expo/fetch";

interface CourseContextValue {
  course: Course | null;
  isLoading: boolean;
  setCourseInfo: (uni: string, title: string) => void;
  addYear: (label: string, weight: number) => void;
  updateYear: (yearId: string, updates: Partial<AcademicYear>) => void;
  removeYear: (yearId: string) => void;
  addModule: (yearId: string, name: string, credits: number) => void;
  updateModule: (
    yearId: string,
    moduleId: string,
    updates: Partial<Module>,
  ) => void;
  removeModule: (yearId: string, moduleId: string) => void;
  addAssessment: (
    yearId: string,
    moduleId: string,
    name: string,
    weight: number,
  ) => void;
  updateAssessment: (
    yearId: string,
    moduleId: string,
    assessmentId: string,
    updates: Partial<Assessment>,
  ) => void;
  removeAssessment: (
    yearId: string,
    moduleId: string,
    assessmentId: string,
  ) => void;
  setModuleTarget: (
    yearId: string,
    moduleId: string,
    target: number | null,
  ) => void;
  setYearTarget: (yearId: string, target: number | null) => void;
  setCourseTarget: (target: number | null) => void;
  resetCourse: () => void;
  createNewCourse: (uni: string, title: string, numYears: number) => void;
  refreshCourse: () => Promise<void>;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchCourse = useCallback(async () => {
    if (!user) {
      setCourse(null);
      setIsLoading(false);
      return;
    }
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/course", baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
      } else {
        setCourse(null);
      }
    } catch {
      setCourse(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const refreshCourse = useCallback(async () => {
    await fetchCourse();
  }, [fetchCourse]);

  const createNewCourse = useCallback(
    async (uni: string, title: string, numYears: number) => {
      try {
        const res = await apiRequest("POST", "/api/course", {
          universityName: uni,
          courseTitle: title,
          numYears,
        });
        const data = await res.json();
        setCourse(data);
      } catch (err) {
        console.error("Create course error:", err);
      }
    },
    [],
  );

  const setCourseInfo = useCallback(
    async (uni: string, title: string) => {
      if (!course) return;
      try {
        await apiRequest("PUT", "/api/course", {
          universityName: uni,
          courseTitle: title,
        });
        setCourse((prev) =>
          prev
            ? { ...prev, universityName: uni, courseTitle: title }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const addYear = useCallback(
    async (label: string, weight: number) => {
      if (!course) return;
      try {
        const res = await apiRequest("POST", `/api/years/${course.id}/add`, {
          label,
          weight,
        });
        const year = await res.json();
        setCourse((prev) =>
          prev ? { ...prev, years: [...prev.years, year] } : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const updateYear = useCallback(
    async (yearId: string, updates: Partial<AcademicYear>) => {
      if (!course) return;
      try {
        await apiRequest("PUT", `/api/years/${yearId}`, updates);
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
                  y.id === yearId ? { ...y, ...updates } : y,
                ),
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const removeYear = useCallback(
    (yearId: string) => {
      if (!course) return;
      setCourse((prev) =>
        prev
          ? { ...prev, years: prev.years.filter((y) => y.id !== yearId) }
          : null,
      );
    },
    [course],
  );

  const addModule = useCallback(
    async (yearId: string, name: string, credits: number) => {
      if (!course) return;
      try {
        const res = await apiRequest("POST", `/api/years/${yearId}/modules`, {
          name,
          credits,
        });
        const mod = await res.json();
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
                  y.id === yearId
                    ? { ...y, modules: [...y.modules, mod] }
                    : y,
                ),
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const updateModule = useCallback(
    async (yearId: string, moduleId: string, updates: Partial<Module>) => {
      if (!course) return;
      try {
        await apiRequest("PUT", `/api/modules/${moduleId}`, updates);
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        modules: y.modules.map((m) =>
                          m.id === moduleId ? { ...m, ...updates } : m,
                        ),
                      }
                    : y,
                ),
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const removeModule = useCallback(
    async (yearId: string, moduleId: string) => {
      if (!course) return;
      try {
        await apiRequest("DELETE", `/api/modules/${moduleId}`);
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        modules: y.modules.filter((m) => m.id !== moduleId),
                      }
                    : y,
                ),
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const addAssessment = useCallback(
    async (
      yearId: string,
      moduleId: string,
      name: string,
      weight: number,
    ) => {
      if (!course) return;
      try {
        const res = await apiRequest(
          "POST",
          `/api/modules/${moduleId}/assessments`,
          { name, weight },
        );
        const assessment = await res.json();
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        modules: y.modules.map((m) =>
                          m.id === moduleId
                            ? {
                                ...m,
                                assessments: [...m.assessments, assessment],
                              }
                            : m,
                        ),
                      }
                    : y,
                ),
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const updateAssessment = useCallback(
    async (
      yearId: string,
      moduleId: string,
      assessmentId: string,
      updates: Partial<Assessment>,
    ) => {
      if (!course) return;
      try {
        await apiRequest("PUT", `/api/assessments/${assessmentId}`, updates);
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
                  y.id === yearId
                    ? {
                        ...y,
                        modules: y.modules.map((m) =>
                          m.id === moduleId
                            ? {
                                ...m,
                                assessments: m.assessments.map((a) =>
                                  a.id === assessmentId
                                    ? { ...a, ...updates }
                                    : a,
                                ),
                              }
                            : m,
                        ),
                      }
                    : y,
                ),
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const removeAssessment = useCallback(
    async (yearId: string, moduleId: string, assessmentId: string) => {
      if (!course) return;
      try {
        await apiRequest("DELETE", `/api/assessments/${assessmentId}`);
        setCourse((prev) =>
          prev
            ? {
                ...prev,
                years: prev.years.map((y) =>
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
              }
            : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
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
    async (target: number | null) => {
      if (!course) return;
      try {
        await apiRequest("PUT", "/api/course", { targetGrade: target });
        setCourse((prev) =>
          prev ? { ...prev, targetGrade: target } : null,
        );
      } catch (err) {
        console.error(err);
      }
    },
    [course],
  );

  const resetCourse = useCallback(async () => {
    try {
      await apiRequest("DELETE", "/api/course");
      setCourse(null);
    } catch (err) {
      console.error(err);
    }
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
      refreshCourse,
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
      refreshCourse,
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
