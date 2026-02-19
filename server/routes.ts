import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  users,
  courses,
  academicYears,
  modules,
  assessments,
  registerSchema,
  loginSchema,
} from "@shared/schema";
import { searchUniversities, searchCourses } from "./uk-universities";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const SALT_ROUNDS = 12;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";

  // Require SESSION_SECRET in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && !sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }

  const PgSession = connectPgSimple(session);
  const sessionPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Trust proxy in production (needed for secure cookies behind Vercel/load balancers)
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
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: isProduction, // HTTPS only in production
        sameSite: isProduction ? "none" : "lax", // "none" needed for cross-origin mobile requests
      },
    }),
  );

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
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  });

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

      return res.json({
        ...course,
        years: yearsWithModules,
      });
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

      const updates: any = {};
      if (universityName !== undefined) updates.universityName = universityName;
      if (courseTitle !== undefined) updates.courseTitle = courseTitle;
      if (targetGrade !== undefined) updates.targetGrade = targetGrade;

      await db.update(courses).set(updates).where(eq(courses.id, course.id));
      return res.json({ message: "Updated" });
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete(
    "/api/course",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await db
          .delete(courses)
          .where(eq(courses.userId, req.session.userId!));
        return res.json({ message: "Deleted" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.put(
    "/api/years/:yearId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { label, weight, targetGrade } = req.body;
        const updates: any = {};
        if (label !== undefined) updates.label = label;
        if (weight !== undefined) updates.weight = weight;
        if (targetGrade !== undefined) updates.targetGrade = targetGrade;

        await db
          .update(academicYears)
          .set(updates)
          .where(eq(academicYears.id, req.params.yearId));
        return res.json({ message: "Updated" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.post(
    "/api/years/:yearId/modules",
    requireAuth,
    async (req: Request, res: Response) => {
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
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.put(
    "/api/modules/:moduleId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { name, credits, targetGrade } = req.body;
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (credits !== undefined) updates.credits = credits;
        if (targetGrade !== undefined) updates.targetGrade = targetGrade;

        await db
          .update(modules)
          .set(updates)
          .where(eq(modules.id, req.params.moduleId));
        return res.json({ message: "Updated" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.delete(
    "/api/modules/:moduleId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await db
          .delete(modules)
          .where(eq(modules.id, req.params.moduleId));
        return res.json({ message: "Deleted" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.post(
    "/api/modules/:moduleId/assessments",
    requireAuth,
    async (req: Request, res: Response) => {
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
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.put(
    "/api/assessments/:assessmentId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const { name, weight, grade, completed } = req.body;
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (weight !== undefined) updates.weight = weight;
        if (grade !== undefined) updates.grade = grade;
        if (completed !== undefined) updates.completed = completed;

        await db
          .update(assessments)
          .set(updates)
          .where(eq(assessments.id, req.params.assessmentId));
        return res.json({ message: "Updated" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.delete(
    "/api/assessments/:assessmentId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await db
          .delete(assessments)
          .where(eq(assessments.id, req.params.assessmentId));
        return res.json({ message: "Deleted" });
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  app.post(
    "/api/years/:courseId/add",
    requireAuth,
    async (req: Request, res: Response) => {
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
      } catch (err) {
        return res.status(500).json({ message: "Server error" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
