import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users - mock auth, will be replaced by Clerk later
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // plain text for mock, Clerk replaces this
  name: text("name").notNull(),
  role: text("role").notNull().default("student"), // "student" | "instructor" | "admin"
});

// Courses - owned by instructors
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instructorId: integer("instructor_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  language: text("language").notNull().default("python"),
  duration: text("duration").notNull().default("6 weeks"),
  price: integer("price").notNull().default(0), // cents, 0 = free during POC
  published: integer("published").notNull().default(0), // 0 or 1
  createdAt: text("created_at").notNull(),
});

// Assignments - belong to courses
export const assignments = sqliteTable("assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  starterCode: text("starter_code").notNull(),
  fileName: text("file_name").notNull().default("main.py"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Enrollments - students enrolled in courses
export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  status: text("status").notNull().default("active"), // active | completed | dropped
  paymentStatus: text("payment_status").notNull().default("free"), // free | paid | pending
  enrolledAt: text("enrolled_at").notNull(),
});

// Submissions
export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: integer("assignment_id").notNull(),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  code: text("code").notNull(),
  defenseScore: integer("defense_score"),
  defenseAnswers: text("defense_answers"),
  submittedAt: text("submitted_at").notNull(),
});

// Insert schemas (omit id)
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true });
export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true });
export const insertSubmissionSchema = createInsertSchema(submissions).omit({ id: true });

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

// Select types
export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
