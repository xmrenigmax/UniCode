import express from "express";
import type { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import {
  users,
  courses,
  academicYears,
  modules,
  assessments,
  registerSchema,
  loginSchema,
} from "../shared/schema";
import * as schema from "../shared/schema";
import {
  searchUniversities,
  searchCourses,
} from "../server/uk-universities";

const app = express();

// --- CORS ---
app.use((req, res, next) => {
  const origin = req.header("origin");

  const allowedOrigins = new Set<string>();
  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(",").forEach((d) => {
      allowedOrigins.add(d.trim());
    });
  }

  const isLocalhost =
    origin?.startsWith("http://localhost:") ||
    origin?.startsWith("http://127.0.0.1:");

  const isMobileApp = !origin;

  if (isMobileApp || (origin && (allowedOrigins.has(origin) || isLocalhost))) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Database ---
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

// --- Session ---
const isProduction = process.env.NODE_ENV === "production";

const sessionSecret = process.env.SESSION_SECRET;
if (isProduction && !sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

const PgSession = connectPgSimple(session);
const sessionPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: sessionSecret || "unigrade-dev-secret-local-only",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    },
  }),
);

// --- Auth middleware ---
const SALT_ROUNDS = 12;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// --- Auth routes ---
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.errors[0]?.message || "Validation failed",
      });
    }
    const { email, password, displayName } = parsed.data;
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        displayName: displayName.trim(),
      })
      .returning();
    req.session.userId = user.id;
    return res.status(201).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.errors[0]?.message || "Validation failed",
      });
    }
    const { email, password } = parsed.data;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.userId = user.id;
    return res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out" });
  });
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    return res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// --- University/course search ---
app.get("/api/universities", (req: Request, res: Response) => {
  const q = (req.query.q as string) || "";
  const results = searchUniversities(q);
  return res.json(results);
});

app.get("/api/courses", (req: Request, res: Response) => {
  const uni = (req.query.university as string) || "";
  const q = (req.query.q as string) || "";
  const results = searchCourses(uni, q);
  return res.json(results);
});

// --- Course CRUD ---
app.get("/api/course", requireAuth, async (req: Request, res: Response) => {
  try {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.userId, req.session.userId!))
      .limit(1);
    if (!course) {
      return res.json(null);
    }
    const years = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.courseId, course.id))
      .orderBy(academicYears.yearNumber);

    const yearsWithModules = await Promise.all(
      years.map(async (year) => {
        const mods = await db
          .select()
          .from(modules)
          .where(eq(modules.yearId, year.id));
        const modsWithAssessments = await Promise.all(
          mods.map(async (mod) => {
            const assts = await db
              .select()
              .from(assessments)
              .where(eq(assessments.moduleId, mod.id));
            return { ...mod, assessments: assts };
          }),
        );
        return { ...year, modules: modsWithAssessments };
      }),
    );

    return res.json({ ...course, years: yearsWithModules });
  } catch (err) {
    console.error("Get course error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/course", requireAuth, async (req: Request, res: Response) => {
  try {
    const { universityName, courseTitle, numYears, targetGrade } = req.body;
    const existing = await db
      .select()
      .from(courses)
      .where(eq(courses.userId, req.session.userId!))
      .limit(1);
    if (existing.length > 0) {
      return res
        .status(409)
        .json({ message: "Course already exists. Delete first." });
    }
    const [course] = await db
      .insert(courses)
      .values({
        userId: req.session.userId!,
        universityName,
        courseTitle,
        targetGrade: targetGrade || null,
      })
      .returning();

    const n = numYears || 3;
    const defaultWeights: Record<number, number[]> = {
      3: [0, 40, 60],
      4: [0, 20, 30, 50],
    };
    const weights =
      defaultWeights[n] || Array(n).fill(Math.round(100 / n));

    for (let i = 0; i < n; i++) {
      await db.insert(academicYears).values({
        courseId: course.id,
        label: `Year ${i + 1}`,
        yearNumber: i + 1,
        weight: weights[i],
      });
    }

    const years = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.courseId, course.id))
      .orderBy(academicYears.yearNumber);

    return res.status(201).json({
      ...course,
      years: years.map((y) => ({ ...y, modules: [] })),
    });
  } catch (err) {
    console.error("Create course error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/course", requireAuth, async (req: Request, res: Response) => {
  try {
    const { universityName, courseTitle, targetGrade } = req.body;
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.userId, req.session.userId!))
      .limit(1);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    const updates: Record<string, unknown> = {};
    if (universityName !== undefined) updates.universityName = universityName;
    if (courseTitle !== undefined) updates.courseTitle = courseTitle;
    if (targetGrade !== undefined) updates.targetGrade = targetGrade;
    await db.update(courses).set(updates).where(eq(courses.id, course.id));
    return res.json({ message: "Updated" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/course", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(courses).where(eq(courses.userId, req.session.userId!));
    return res.json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// --- Year routes ---
app.put("/api/years/:yearId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { label, weight, targetGrade } = req.body;
    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label;
    if (weight !== undefined) updates.weight = weight;
    if (targetGrade !== undefined) updates.targetGrade = targetGrade;
    await db
      .update(academicYears)
      .set(updates)
      .where(eq(academicYears.id, req.params.yearId));
    return res.json({ message: "Updated" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/years/:yearId/modules", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, credits } = req.body;
    const [mod] = await db
      .insert(modules)
      .values({
        yearId: req.params.yearId,
        name,
        credits: credits || 20,
      })
      .returning();
    return res.status(201).json({ ...mod, assessments: [] });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/years/:courseId/add", requireAuth, async (req: Request, res: Response) => {
  try {
    const { label, weight } = req.body;
    const existingYears = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.courseId, req.params.courseId));
    const yearNumber = existingYears.length + 1;
    const [year] = await db
      .insert(academicYears)
      .values({
        courseId: req.params.courseId,
        label: label || `Year ${yearNumber}`,
        yearNumber,
        weight: weight || 0,
      })
      .returning();
    return res.status(201).json({ ...year, modules: [] });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// --- Module routes ---
app.put("/api/modules/:moduleId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, credits, targetGrade } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (credits !== undefined) updates.credits = credits;
    if (targetGrade !== undefined) updates.targetGrade = targetGrade;
    await db
      .update(modules)
      .set(updates)
      .where(eq(modules.id, req.params.moduleId));
    return res.json({ message: "Updated" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/modules/:moduleId", requireAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(modules).where(eq(modules.id, req.params.moduleId));
    return res.json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// --- Assessment routes ---
app.post("/api/modules/:moduleId/assessments", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, weight } = req.body;
    const [assessment] = await db
      .insert(assessments)
      .values({
        moduleId: req.params.moduleId,
        name,
        weight,
      })
      .returning();
    return res.status(201).json(assessment);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/assessments/:assessmentId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, weight, grade, completed } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (weight !== undefined) updates.weight = weight;
    if (grade !== undefined) updates.grade = grade;
    if (completed !== undefined) updates.completed = completed;
    await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, req.params.assessmentId));
    return res.json({ message: "Updated" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/assessments/:assessmentId", requireAuth, async (req: Request, res: Response) => {
  try {
    await db
      .delete(assessments)
      .where(eq(assessments.id, req.params.assessmentId));
    return res.json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
});

// --- Health check ---
app.get("/api/health", (_req: Request, res: Response) => {
  return res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Landing page ---
app.get("/", (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniGrade - Track Your University Grades</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0A0F1C;
      --surface: #111827;
      --surface-elevated: #1A2236;
      --border: #1E293B;
      --border-light: #2D3A50;
      --primary: #3B82F6;
      --primary-hover: #2563EB;
      --primary-glow: rgba(59, 130, 246, 0.15);
      --success: #10B981;
      --success-bg: rgba(16, 185, 129, 0.1);
      --danger: #EF4444;
      --danger-bg: rgba(239, 68, 68, 0.1);
      --warning: #F59E0B;
      --warning-bg: rgba(245, 158, 11, 0.1);
      --text: #F1F5F9;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    /* Nav */
    nav {
      position: sticky; top: 0; z-index: 50;
      background: rgba(10, 15, 28, 0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
    }
    .nav-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
      height: 64px;
    }
    .nav-brand {
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: 20px; color: var(--text);
      text-decoration: none;
    }
    .nav-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--primary);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .nav-links { display: flex; gap: 8px; }
    .nav-links a {
      color: var(--text-secondary); text-decoration: none;
      font-size: 14px; font-weight: 500; padding: 6px 14px;
      border-radius: 8px; transition: all 0.2s;
    }
    .nav-links a:hover { color: var(--text); background: var(--surface-elevated); }

    /* Hero */
    .hero {
      text-align: center;
      padding: 80px 24px 60px;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute; top: 0; left: 50%; transform: translateX(-50%);
      width: 600px; height: 400px;
      background: radial-gradient(ellipse, var(--primary-glow) 0%, transparent 70%);
      pointer-events: none;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--surface-elevated);
      border: 1px solid var(--border-light);
      border-radius: 100px; padding: 6px 16px;
      font-size: 13px; font-weight: 500; color: var(--text-secondary);
      margin-bottom: 24px;
    }
    .badge-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--success);
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    h1 {
      font-size: clamp(36px, 6vw, 56px);
      font-weight: 800; letter-spacing: -0.03em;
      line-height: 1.1; margin-bottom: 16px;
    }
    h1 span { color: var(--primary); }
    .hero-subtitle {
      font-size: 18px; color: var(--text-secondary);
      max-width: 520px; margin: 0 auto 36px;
      line-height: 1.6;
    }
    .hero-actions {
      display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
    }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 24px; border-radius: 12px;
      font-size: 15px; font-weight: 600;
      text-decoration: none; border: none; cursor: pointer;
      transition: all 0.2s; font-family: inherit;
    }
    .btn-primary {
      background: var(--primary); color: #fff;
    }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn-outline {
      background: transparent; color: var(--text);
      border: 1px solid var(--border-light);
    }
    .btn-outline:hover { background: var(--surface-elevated); border-color: var(--text-muted); }
    .btn-sm {
      padding: 8px 16px; font-size: 13px; border-radius: 8px;
    }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover { opacity: 0.9; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-danger:hover { opacity: 0.9; }

    /* Sections */
    .section {
      max-width: 1100px; margin: 0 auto;
      padding: 60px 24px;
    }
    .section-title {
      font-size: 28px; font-weight: 700; letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .section-subtitle {
      color: var(--text-secondary); font-size: 15px;
      margin-bottom: 32px;
    }

    /* Download cards */
    .download-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }
    .download-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px; padding: 28px;
      display: flex; flex-direction: column; gap: 16px;
      transition: all 0.2s;
    }
    .download-card:hover { border-color: var(--border-light); transform: translateY(-2px); }
    .download-card-header {
      display: flex; align-items: center; gap: 14px;
    }
    .download-card-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
    }
    .download-card-icon.ios { background: #1A1A2E; }
    .download-card-icon.android { background: #1A2E1A; }
    .download-card h3 { font-size: 18px; font-weight: 700; }
    .download-card p { color: var(--text-secondary); font-size: 14px; line-height: 1.5; }

    /* Test Panel */
    .test-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }
    .test-panel-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .test-panel-header h3 { font-size: 16px; font-weight: 600; }
    .test-list { padding: 8px; }
    .test-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-radius: 10px;
      transition: background 0.15s;
    }
    .test-item:hover { background: var(--surface-elevated); }
    .test-item-left { display: flex; align-items: center; gap: 12px; }
    .test-method {
      font-size: 11px; font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace;
      padding: 3px 8px; border-radius: 4px; min-width: 44px; text-align: center;
    }
    .test-method.get { background: rgba(16, 185, 129, 0.15); color: var(--success); }
    .test-method.post { background: rgba(59, 130, 246, 0.15); color: var(--primary); }
    .test-endpoint {
      font-size: 14px; font-weight: 500; color: var(--text);
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .test-status {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 500;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
    }
    .status-idle .status-dot { background: var(--text-muted); }
    .status-idle span { color: var(--text-muted); }
    .status-loading .status-dot { background: var(--warning); animation: pulse-dot 0.6s ease-in-out infinite; }
    .status-loading span { color: var(--warning); }
    .status-pass .status-dot { background: var(--success); }
    .status-pass span { color: var(--success); }
    .status-fail .status-dot { background: var(--danger); }
    .status-fail span { color: var(--danger); }

    .test-actions {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex; gap: 8px; align-items: center; justify-content: space-between;
    }
    .test-summary {
      font-size: 13px; color: var(--text-muted);
    }

    /* Log area */
    .log-area {
      background: #0D1117;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
      max-height: 300px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      line-height: 1.8;
    }
    .log-line { color: var(--text-muted); }
    .log-line.success { color: var(--success); }
    .log-line.error { color: var(--danger); }
    .log-line.info { color: var(--primary); }
    .log-line .timestamp { color: var(--text-muted); opacity: 0.5; margin-right: 8px; }

    /* Features grid */
    .features-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; margin-top: 32px;
    }
    .feature-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 12px; padding: 24px;
    }
    .feature-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .feature-card p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 32px 24px; text-align: center;
      color: var(--text-muted); font-size: 13px;
    }

    /* Mobile */
    @media (max-width: 640px) {
      .nav-links { display: none; }
      .hero { padding: 48px 20px 40px; }
      .section { padding: 40px 20px; }
      .download-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <nav>
    <div class="nav-inner">
      <a href="/" class="nav-brand">
        <div class="nav-icon">U</div>
        UniGrade
      </a>
      <div class="nav-links">
        <a href="#download">Download</a>
        <a href="#test">API Test</a>
        <a href="#features">Features</a>
      </div>
    </div>
  </nav>

  <section class="hero">
    <div class="badge">
      <div class="badge-dot"></div>
      Backend online
    </div>
    <h1>Track your <span>university grades</span> with ease</h1>
    <p class="hero-subtitle">
      UniGrade helps you monitor your academic performance, calculate weighted averages, 
      and stay on top of your degree classification.
    </p>
    <div class="hero-actions">
      <a href="#download" class="btn btn-primary">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Download App
      </a>
      <a href="#test" class="btn btn-outline">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Test Backend
      </a>
    </div>
  </section>

  <section class="section" id="download">
    <h2 class="section-title">Download UniGrade</h2>
    <p class="section-subtitle">Get the app on your device. Currently in development -- builds available via Expo.</p>
    <div class="download-grid">
      <div class="download-card">
        <div class="download-card-header">
          <div class="download-card-icon ios">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          </div>
          <div>
            <h3>iOS (iPhone)</h3>
            <p style="color:var(--text-muted);font-size:13px;margin:0">Apple App Store</p>
          </div>
        </div>
        <p>Coming soon to the App Store. Build locally with <code style="background:var(--surface-elevated);padding:2px 6px;border-radius:4px;font-size:13px">eas build --platform ios</code></p>
        <a href="#" class="btn btn-outline btn-sm" style="align-self:flex-start;opacity:0.5;pointer-events:none">Coming Soon</a>
      </div>
      <div class="download-card">
        <div class="download-card-header">
          <div class="download-card-icon android">
            <svg width="24" height="24" fill="#3DDC84" viewBox="0 0 24 24"><path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V7H6v11zM3.5 7C2.67 7 2 7.67 2 8.5v7c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-7C5 7.67 4.33 7 3.5 7zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/></svg>
          </div>
          <div>
            <h3>Android (APK)</h3>
            <p style="color:var(--text-muted);font-size:13px;margin:0">Google Play Store</p>
          </div>
        </div>
        <p>Coming soon to Google Play. Build locally with <code style="background:var(--surface-elevated);padding:2px 6px;border-radius:4px;font-size:13px">eas build --platform android</code></p>
        <a href="#" class="btn btn-outline btn-sm" style="align-self:flex-start;opacity:0.5;pointer-events:none">Coming Soon</a>
      </div>
    </div>
  </section>

  <section class="section" id="test">
    <h2 class="section-title">Backend API Test</h2>
    <p class="section-subtitle">Run live tests against the API to verify database connectivity, auth, and data endpoints.</p>

    <div class="test-panel">
      <div class="test-panel-header">
        <h3>Endpoint Tests</h3>
        <span class="test-summary" id="test-summary">0 / 5 passed</span>
      </div>
      <div class="test-list">
        <div class="test-item" data-test="health">
          <div class="test-item-left">
            <span class="test-method get">GET</span>
            <span class="test-endpoint">/api/health</span>
          </div>
          <div class="test-status status-idle" id="status-health">
            <div class="status-dot"></div>
            <span>Idle</span>
          </div>
        </div>
        <div class="test-item" data-test="register">
          <div class="test-item-left">
            <span class="test-method post">POST</span>
            <span class="test-endpoint">/api/auth/register</span>
          </div>
          <div class="test-status status-idle" id="status-register">
            <div class="status-dot"></div>
            <span>Idle</span>
          </div>
        </div>
        <div class="test-item" data-test="login">
          <div class="test-item-left">
            <span class="test-method post">POST</span>
            <span class="test-endpoint">/api/auth/login</span>
          </div>
          <div class="test-status status-idle" id="status-login">
            <div class="status-dot"></div>
            <span>Idle</span>
          </div>
        </div>
        <div class="test-item" data-test="me">
          <div class="test-item-left">
            <span class="test-method get">GET</span>
            <span class="test-endpoint">/api/auth/me</span>
          </div>
          <div class="test-status status-idle" id="status-me">
            <div class="status-dot"></div>
            <span>Idle</span>
          </div>
        </div>
        <div class="test-item" data-test="universities">
          <div class="test-item-left">
            <span class="test-method get">GET</span>
            <span class="test-endpoint">/api/universities?q=oxford</span>
          </div>
          <div class="test-status status-idle" id="status-universities">
            <div class="status-dot"></div>
            <span>Idle</span>
          </div>
        </div>
      </div>
      <div class="test-actions">
        <button class="btn btn-primary btn-sm" id="run-tests" onclick="runAllTests()">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Run All Tests
        </button>
        <button class="btn btn-outline btn-sm" onclick="clearTests()">Clear</button>
      </div>
    </div>

    <div class="log-area" id="log-area">
      <div class="log-line info">Ready to run tests. Click "Run All Tests" to begin.</div>
    </div>
  </section>

  <section class="section" id="features">
    <h2 class="section-title">What UniGrade does</h2>
    <p class="section-subtitle">Everything you need to track your degree progress.</p>
    <div class="features-grid">
      <div class="feature-card">
        <h4>Grade Tracking</h4>
        <p>Log assessments, coursework, and exams with weighted grade calculations.</p>
      </div>
      <div class="feature-card">
        <h4>Degree Classification</h4>
        <p>See your predicted classification in real-time based on UK university standards.</p>
      </div>
      <div class="feature-card">
        <h4>Year Weighting</h4>
        <p>Configure how much each year contributes to your final degree (e.g., 40/60 split).</p>
      </div>
      <div class="feature-card">
        <h4>University Search</h4>
        <p>Find your university and course from a comprehensive UK university database.</p>
      </div>
    </div>
  </section>

  <footer>
    <p>UniGrade &copy; 2026. Built with Expo, Express, and PostgreSQL. Deployed on Vercel.</p>
  </footer>

  <script>
    const BASE = window.location.origin;
    let passed = 0;
    let testEmail = 'test_' + Date.now() + '@unigrade-test.com';
    let testPassword = 'TestPass123';

    function log(msg, type = '') {
      const area = document.getElementById('log-area');
      const time = new Date().toLocaleTimeString();
      area.innerHTML += '<div class="log-line ' + type + '"><span class="timestamp">' + time + '</span>' + msg + '</div>';
      area.scrollTop = area.scrollHeight;
    }

    function setStatus(id, status, label) {
      const el = document.getElementById('status-' + id);
      el.className = 'test-status status-' + status;
      el.querySelector('span').textContent = label;
    }

    function updateSummary() {
      document.getElementById('test-summary').textContent = passed + ' / 5 passed';
    }

    function clearTests() {
      passed = 0;
      testEmail = 'test_' + Date.now() + '@unigrade-test.com';
      ['health','register','login','me','universities'].forEach(id => setStatus(id, 'idle', 'Idle'));
      document.getElementById('log-area').innerHTML = '<div class="log-line info">Ready to run tests. Click "Run All Tests" to begin.</div>';
      updateSummary();
    }

    async function runAllTests() {
      passed = 0;
      document.getElementById('run-tests').disabled = true;
      document.getElementById('log-area').innerHTML = '';
      log('Starting backend test suite...', 'info');

      // Test 1: Health
      setStatus('health', 'loading', 'Testing...');
      try {
        log('GET /api/health');
        const r = await fetch(BASE + '/api/health');
        const d = await r.json();
        if (d.status === 'ok') {
          setStatus('health', 'pass', 'Pass');
          log('Health check passed: ' + JSON.stringify(d), 'success');
          passed++;
        } else {
          throw new Error('Unexpected response');
        }
      } catch(e) {
        setStatus('health', 'fail', 'Fail');
        log('Health check failed: ' + e.message, 'error');
      }
      updateSummary();

      // Test 2: Register
      setStatus('register', 'loading', 'Testing...');
      try {
        log('POST /api/auth/register (email: ' + testEmail + ')');
        const r = await fetch(BASE + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: testPassword, displayName: 'Test User' }),
          credentials: 'include'
        });
        const d = await r.json();
        if (r.status === 201 && d.id) {
          setStatus('register', 'pass', 'Pass');
          log('Registration passed: user ' + d.id + ' created', 'success');
          passed++;
        } else if (r.status === 409) {
          setStatus('register', 'pass', 'Pass (exists)');
          log('Registration: email already exists (this is fine)', 'success');
          passed++;
        } else {
          throw new Error(d.message || 'Status ' + r.status);
        }
      } catch(e) {
        setStatus('register', 'fail', 'Fail');
        log('Registration failed: ' + e.message, 'error');
      }
      updateSummary();

      // Test 3: Login
      setStatus('login', 'loading', 'Testing...');
      try {
        log('POST /api/auth/login');
        const r = await fetch(BASE + '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail, password: testPassword }),
          credentials: 'include'
        });
        const d = await r.json();
        if (r.ok && d.id) {
          setStatus('login', 'pass', 'Pass');
          log('Login passed: authenticated as ' + d.email, 'success');
          passed++;
        } else {
          throw new Error(d.message || 'Status ' + r.status);
        }
      } catch(e) {
        setStatus('login', 'fail', 'Fail');
        log('Login failed: ' + e.message, 'error');
      }
      updateSummary();

      // Test 4: Auth me (session check)
      setStatus('me', 'loading', 'Testing...');
      try {
        log('GET /api/auth/me (session check)');
        const r = await fetch(BASE + '/api/auth/me', { credentials: 'include' });
        const d = await r.json();
        if (r.ok && d.id) {
          setStatus('me', 'pass', 'Pass');
          log('Session check passed: logged in as ' + d.displayName, 'success');
          passed++;
        } else {
          throw new Error(d.message || 'Status ' + r.status);
        }
      } catch(e) {
        setStatus('me', 'fail', 'Fail');
        log('Session check failed: ' + e.message, 'error');
      }
      updateSummary();

      // Test 5: Universities search
      setStatus('universities', 'loading', 'Testing...');
      try {
        log('GET /api/universities?q=oxford');
        const r = await fetch(BASE + '/api/universities?q=oxford');
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) {
          setStatus('universities', 'pass', 'Pass');
          log('University search passed: found ' + d.length + ' results', 'success');
          passed++;
        } else {
          throw new Error('No results returned');
        }
      } catch(e) {
        setStatus('universities', 'fail', 'Fail');
        log('University search failed: ' + e.message, 'error');
      }
      updateSummary();

      log('');
      if (passed === 5) {
        log('All 5 tests passed! Backend is fully operational.', 'success');
      } else {
        log(passed + '/5 tests passed. Check logs above for failures.', passed > 0 ? 'info' : 'error');
      }

      document.getElementById('run-tests').disabled = false;
    }
  </script>

</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  return res.send(html);
});

// --- Error handler ---
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  const error = err as { status?: number; statusCode?: number; message?: string };
  const status = error.status || error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(status).json({ message });
});

export default app;
