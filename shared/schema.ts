import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    universityName: text("university_name").notNull(),
    courseTitle: text("course_title").notNull(),
    targetGrade: real("target_grade"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("courses_user_idx").on(table.userId)],
);

export const academicYears = pgTable(
  "academic_years",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    courseId: varchar("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    yearNumber: integer("year_number").notNull(),
    weight: real("weight").notNull().default(0),
    targetGrade: real("target_grade"),
  },
  (table) => [index("years_course_idx").on(table.courseId)],
);

export const modules = pgTable(
  "modules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    yearId: varchar("year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    credits: integer("credits").notNull().default(20),
    targetGrade: real("target_grade"),
  },
  (table) => [index("modules_year_idx").on(table.yearId)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    moduleId: varchar("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    weight: real("weight").notNull(),
    grade: real("grade"),
    completed: boolean("completed").notNull().default(false),
  },
  (table) => [index("assessments_module_idx").on(table.moduleId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, { fields: [courses.userId], references: [users.id] }),
  years: many(academicYears),
}));

export const yearsRelations = relations(academicYears, ({ one, many }) => ({
  course: one(courses, {
    fields: [academicYears.courseId],
    references: [courses.id],
  }),
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  year: one(academicYears, {
    fields: [modules.yearId],
    references: [academicYears.id],
  }),
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  module: one(modules, {
    fields: [assessments.moduleId],
    references: [modules.id],
  }),
}));

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  displayName: z.string().min(1, "Display name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type AcademicYear = typeof academicYears.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
