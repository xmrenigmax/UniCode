-- Create all tables for UniGrade app
-- Based on shared/schema.ts Drizzle definitions

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "display_name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "courses" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "university_name" text NOT NULL,
  "course_title" text NOT NULL,
  "target_grade" real,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "courses_user_idx" ON "courses" ("user_id");

CREATE TABLE IF NOT EXISTS "academic_years" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" varchar NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "year_number" integer NOT NULL,
  "weight" real NOT NULL DEFAULT 0,
  "target_grade" real
);

CREATE INDEX IF NOT EXISTS "years_course_idx" ON "academic_years" ("course_id");

CREATE TABLE IF NOT EXISTS "modules" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "year_id" varchar NOT NULL REFERENCES "academic_years"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "credits" integer NOT NULL DEFAULT 20,
  "target_grade" real
);

CREATE INDEX IF NOT EXISTS "modules_year_idx" ON "modules" ("year_id");

CREATE TABLE IF NOT EXISTS "assessments" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "module_id" varchar NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "weight" real NOT NULL,
  "grade" real,
  "completed" boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "assessments_module_idx" ON "assessments" ("module_id");

-- Session table for connect-pg-simple (express-session)
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
