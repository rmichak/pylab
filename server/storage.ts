import {
  type User,
  type InsertUser,
  type Course,
  type InsertCourse,
  type Assignment,
  type InsertAssignment,
  type Enrollment,
  type InsertEnrollment,
  type Submission,
  type InsertSubmission,
  users,
  courses,
  assignments,
  enrollments,
  submissions,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;

  // Course
  getCourse(id: number): Promise<Course | undefined>;
  getCoursesByInstructor(instructorId: number): Promise<Course[]>;
  getPublishedCourses(): Promise<Course[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course | undefined>;

  // Assignment
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAssignmentsByCourse(courseId: number): Promise<Assignment[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, updates: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<void>;

  // Enrollment
  getEnrollment(studentId: number, courseId: number): Promise<Enrollment | undefined>;
  getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]>;
  getEnrollmentsByCourse(courseId: number): Promise<Enrollment[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;

  // Submission
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
}

export class DatabaseStorage implements IStorage {
  // ─── User ────────────────────────────────────────────────────────────────────

  async getUser(id: number): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return db.insert(users).values(insertUser).returning().get();
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role)).all();
  }

  // ─── Course ──────────────────────────────────────────────────────────────────

  async getCourse(id: number): Promise<Course | undefined> {
    return db.select().from(courses).where(eq(courses.id, id)).get();
  }

  async getCoursesByInstructor(instructorId: number): Promise<Course[]> {
    return db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.id))
      .all();
  }

  async getPublishedCourses(): Promise<Course[]> {
    return db
      .select()
      .from(courses)
      .where(eq(courses.published, 1))
      .orderBy(desc(courses.id))
      .all();
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    return db.insert(courses).values(insertCourse).returning().get();
  }

  async updateCourse(
    id: number,
    updates: Partial<InsertCourse>
  ): Promise<Course | undefined> {
    return db
      .update(courses)
      .set(updates)
      .where(eq(courses.id, id))
      .returning()
      .get();
  }

  // ─── Assignment ──────────────────────────────────────────────────────────────

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return db.select().from(assignments).where(eq(assignments.id, id)).get();
  }

  async getAssignmentsByCourse(courseId: number): Promise<Assignment[]> {
    return db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(assignments.sortOrder)
      .all();
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    return db.insert(assignments).values(insertAssignment).returning().get();
  }

  async updateAssignment(
    id: number,
    updates: Partial<InsertAssignment>
  ): Promise<Assignment | undefined> {
    return db
      .update(assignments)
      .set(updates)
      .where(eq(assignments.id, id))
      .returning()
      .get();
  }

  async deleteAssignment(id: number): Promise<void> {
    db.delete(assignments).where(eq(assignments.id, id)).run();
  }

  // ─── Enrollment ──────────────────────────────────────────────────────────────

  async getEnrollment(
    studentId: number,
    courseId: number
  ): Promise<Enrollment | undefined> {
    return db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, studentId),
          eq(enrollments.courseId, courseId)
        )
      )
      .get();
  }

  async getEnrollmentsByStudent(studentId: number): Promise<Enrollment[]> {
    return db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId))
      .orderBy(desc(enrollments.id))
      .all();
  }

  async getEnrollmentsByCourse(courseId: number): Promise<Enrollment[]> {
    return db
      .select()
      .from(enrollments)
      .where(eq(enrollments.courseId, courseId))
      .all();
  }

  async createEnrollment(insertEnrollment: InsertEnrollment): Promise<Enrollment> {
    return db.insert(enrollments).values(insertEnrollment).returning().get();
  }

  // ─── Submission ──────────────────────────────────────────────────────────────

  async getSubmission(id: number): Promise<Submission | undefined> {
    return db.select().from(submissions).where(eq(submissions.id, id)).get();
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.assignmentId, assignmentId))
      .orderBy(desc(submissions.id))
      .all();
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.id))
      .all();
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    return db.insert(submissions).values(insertSubmission).returning().get();
  }
}

export const storage = new DatabaseStorage();
