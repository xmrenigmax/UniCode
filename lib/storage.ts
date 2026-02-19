import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Course } from "./types";

const COURSE_KEY = "unigrade_course";

export async function saveCourse(course: Course): Promise<void> {
  await AsyncStorage.setItem(COURSE_KEY, JSON.stringify(course));
}

export async function loadCourse(): Promise<Course | null> {
  const data = await AsyncStorage.getItem(COURSE_KEY);
  if (!data) return null;
  return JSON.parse(data) as Course;
}

export async function deleteCourse(): Promise<void> {
  await AsyncStorage.removeItem(COURSE_KEY);
}
