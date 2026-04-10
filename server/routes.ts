import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Anthropic } from "@anthropic-ai/sdk";
import { exec } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const tmpDir = join(process.cwd(), ".tmp");
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

function getAnthropicClient(): Anthropic | null {
  try {
    return new Anthropic();
  } catch {
    return null;
  }
}

// ─── Token Auth (no cookies — works in sandboxed iframes) ────────────────────

// Map of token -> userId
const tokenStore = new Map<string, number>();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getUserIdFromRequest(req: Request): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return tokenStore.get(token) ?? null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as any).userId = userId;
  next();
}

function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await storage.getUser(userId);
    if (!user || user.role !== role) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    (req as any).userId = userId;
    next();
  };
}

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seedData() {
  // Check if instructor already exists
  const existingInstructor = await storage.getUserByEmail("instructor@pylab.dev");
  if (existingInstructor) return; // Already seeded

  // Create instructor
  const instructor = await storage.createUser({
    email: "instructor@pylab.dev",
    password: "demo123",
    name: "Dr. Smith",
    role: "instructor",
  });

  // Create student
  const student = await storage.createUser({
    email: "student@pylab.dev",
    password: "demo123",
    name: "Alex Student",
    role: "student",
  });

  // Create demo course
  const now = new Date().toISOString();
  const course = await storage.createCourse({
    instructorId: instructor.id,
    title: "Introduction to Python",
    description:
      "Learn the fundamentals of Python programming through hands-on assignments and real-time code execution. Perfect for beginners.",
    language: "python",
    duration: "6 weeks",
    price: 0,
    published: 1,
    createdAt: now,
  });

  // Assignment 1: Hello World
  await storage.createAssignment({
    courseId: course.id,
    title: "Hello World with User Input",
    fileName: "hello_world.py",
    sortOrder: 0,
    starterCode: `# Hello World with User Input
# TODO: Prompt the user to enter a message
# TODO: Store the message in a variable
# TODO: Print a greeting with the message in the format: Hello, [message]!

# Example output:
# Enter a message: Cybersecurity is awesome
# Hello, Cybersecurity is awesome!
`,
    instructions: `# Hello World with User Input

## Overview
In this assignment, you'll create a simple Python program that demonstrates basic user input and output — fundamental skills for any programmer.

## Requirements
- **Prompt the user** for a message using \`input()\`
- **Store the message** in a variable
- **Print the message** back to the console with a greeting
- Your output should follow this format:

\`\`\`
Hello, [message]!
\`\`\`

## Example Run
\`\`\`
Enter a message: Cybersecurity is awesome
Hello, Cybersecurity is awesome!
\`\`\`

## Submission Instructions
1. Write your Python code in the provided starter file (\`hello_world.py\`)
2. **Run your program** and test it with at least 2 different inputs
3. **Capture a screenshot** of your terminal showing:
   - Your program running with at least one example input/output
   - The output must be clearly visible
4. Complete the **Code Defense** to verify your understanding`,
  });

  // Assignment 2: Simple Calculator
  await storage.createAssignment({
    courseId: course.id,
    title: "Simple Calculator",
    fileName: "calculator.py",
    sortOrder: 1,
    starterCode: `# Simple Calculator
# TODO: Ask the user for the first number
# TODO: Ask the user for the second number
# TODO: Ask the user for an operation (+, -, *, /)
# TODO: Perform the calculation and print the result
# TODO: Handle division by zero

# Example output:
# Enter first number: 10
# Enter second number: 5
# Enter operation (+, -, *, /): +
# Result: 10 + 5 = 15
`,
    instructions: `# Simple Calculator

## Overview
Build a basic calculator that takes two numbers and an operation from the user, then displays the result.

## Requirements
- **Ask the user** for two numbers using \`input()\`
- **Convert** the inputs to numbers using \`int()\` or \`float()\`
- **Ask for an operation**: +, -, *, or /
- **Calculate** and display the result
- **Handle division by zero** with an error message

## Example Run
\`\`\`
Enter first number: 10
Enter second number: 5
Enter operation (+, -, *, /): +
Result: 10 + 5 = 15
\`\`\`

## Hints
- Use \`float()\` to convert string input to a number
- Use \`if/elif/else\` to check which operation was selected
- Check if the second number is 0 before dividing

## Submission
1. Write and test your code
2. Run it with at least 3 different operations
3. Complete the **Code Defense** when ready`,
  });

  // Assignment 3: FizzBuzz
  await storage.createAssignment({
    courseId: course.id,
    title: "FizzBuzz Challenge",
    fileName: "fizzbuzz.py",
    sortOrder: 2,
    starterCode: `# FizzBuzz Challenge
# TODO: Loop through numbers 1 to 20
# TODO: If the number is divisible by both 3 and 5, print "FizzBuzz"
# TODO: If divisible by 3 only, print "Fizz"
# TODO: If divisible by 5 only, print "Buzz"
# TODO: Otherwise, print the number

# Expected output (first 15 lines):
# 1
# 2
# Fizz
# 4
# Buzz
# Fizz
# 7
# 8
# Fizz
# Buzz
# 11
# Fizz
# 13
# 14
# FizzBuzz
`,
    instructions: `# FizzBuzz Challenge

## Overview
FizzBuzz is a classic programming challenge. Print numbers from 1 to 20, but replace certain numbers with words based on divisibility rules.

## Requirements
- **Loop** through numbers 1 to 20
- If the number is divisible by **both 3 and 5**, print \`FizzBuzz\`
- If divisible by **3 only**, print \`Fizz\`
- If divisible by **5 only**, print \`Buzz\`
- Otherwise, print the **number itself**

## Key Concepts
- \`for\` loops with \`range()\`
- The modulo operator \`%\` (returns the remainder)
- \`if/elif/else\` conditional logic
- **Order matters**: check divisible by both 3 AND 5 first

## Hints
- \`number % 3 == 0\` checks if a number is divisible by 3
- Use \`and\` to combine conditions
- The order of your \`if/elif/else\` conditions is crucial

## Submission
1. Write and test your code
2. Verify the output matches the expected pattern
3. Complete the **Code Defense** when ready`,
  });

  // Enroll student in the demo course
  await storage.createEnrollment({
    studentId: student.id,
    courseId: course.id,
    status: "active",
    paymentStatus: "free",
    enrolledAt: now,
  });
}

// ─── Fallback helpers ─────────────────────────────────────────────────────────

function getFallbackChatResponse(question: string, code: string): string {
  const q = question.toLowerCase();

  if (q.includes("input")) {
    return "The input() function pauses your program and waits for the user to type something. It returns what they type as a string. Try it: `message = input('Enter something: ')`";
  }
  if (q.includes("print")) {
    return "print() displays text on the screen. You can print strings, variables, or combine them. For example: `print('Hello,', name)` will print 'Hello,' followed by the value of name.";
  }
  if (q.includes("variable")) {
    return "A variable is like a labeled box that stores a value. You create one by choosing a name and using = to assign a value. Example: `name = 'Alice'` stores the text 'Alice' in a variable called name.";
  }
  if (q.includes("error") || q.includes("syntax")) {
    return "Syntax errors mean Python doesn't understand your code. Check for: missing colons after if/for/while, unmatched parentheses or quotes, and incorrect indentation. The error message tells you which line to check.";
  }
  if (q.includes("loop") || q.includes("for")) {
    return "A for loop repeats code for each item in a sequence. `for i in range(5):` runs the indented code 5 times, with i going from 0 to 4. Make sure to indent the code inside the loop.";
  }
  if (q.includes("if") || q.includes("condition")) {
    return "if statements let your program make decisions. The syntax is: `if condition:` followed by indented code. You can add `elif` for additional conditions and `else` for everything else.";
  }
  if (q.includes("string")) {
    return "Strings are text in Python, created with quotes: `'hello'` or `\"hello\"`. You can combine them with + and use methods like .upper(), .lower(), .strip(). input() always returns a string.";
  }
  if (
    q.includes("int") ||
    q.includes("float") ||
    q.includes("number") ||
    q.includes("convert")
  ) {
    return "Use int() to convert to a whole number and float() for decimal numbers. Since input() returns a string, you'll need to convert: `number = int(input('Enter a number: '))`. Be careful — this will error if the user types text instead of a number.";
  }

  return "That's a good question. Think about what each line of your code does, step by step. Try adding a print() statement to see what values your variables hold at each step. What specific part are you stuck on?";
}

function getFallbackDefenseQuestions(
  code: string
): Array<{ question: string; id: number }> {
  const questions: string[] = [];

  if (code.includes("input(")) {
    questions.push(
      "What does the input() function do in your code, and what type of data does it return?"
    );
  } else {
    questions.push("Explain the purpose of your program in one or two sentences.");
  }

  if (code.includes("print(")) {
    questions.push(
      "Explain what your print statement(s) will display when the program runs."
    );
  } else if (code.includes("for ") || code.includes("while ")) {
    questions.push(
      "How many times does your loop run, and what determines when it stops?"
    );
  } else {
    questions.push(
      "Walk through your code line by line — what happens at each step?"
    );
  }

  if (code.includes("if ")) {
    questions.push(
      "What condition are you checking in your if statement, and what happens if it is False?"
    );
  } else if (code.includes("=") && !code.includes("==")) {
    questions.push(
      "What variables did you create, and why did you choose those names?"
    );
  } else {
    questions.push(
      "If you had to change this program to handle a different input, what would you modify?"
    );
  }

  return questions.map((q, i) => ({ question: q, id: i }));
}

function getFallbackDefenseEvaluation(
  questions: string[],
  answers: string[]
): {
  score: number;
  total: number;
  feedback: Array<{
    question: string;
    answer: string;
    correct: boolean;
    explanation: string;
  }>;
} {
  const feedback = questions.map((q: string, i: number) => {
    const answer = answers[i] || "";
    const hasSubstance = answer.length >= 10;
    const hasPythonTerms =
      /\b(variable|function|print|input|string|int|loop|if|return|value|output|user|data|number)\b/i.test(
        answer
      );
    const correct = hasSubstance && hasPythonTerms;

    return {
      question: q,
      answer,
      correct,
      explanation: correct
        ? "Your answer shows understanding of the concept."
        : "Your answer could be more detailed. Try to use specific Python terminology and explain what the code actually does.",
    };
  });

  const score = feedback.filter((f) => f.correct).length;
  return { score, total: questions.length, feedback };
}

// ─── Register Routes ──────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed demo data
  await seedData();

  // ── Auth ────────────────────────────────────────────────────────────────────

  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const user = await storage.createUser({
      email,
      password,
      name,
      role: role || "student",
    });

    const token = generateToken();
    tokenStore.set(token, user.id);
    const { password: _pw, ...safeUser } = user;
    res.status(201).json({ ...safeUser, token });
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await storage.getUserByEmail(email);
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken();
    tokenStore.set(token, user.id);
    const { password: _pw, ...safeUser } = user;
    res.json({ ...safeUser, token });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      tokenStore.delete(authHeader.slice(7));
    }
    res.json({ ok: true });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await storage.getUser(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  });

  // ── Courses ─────────────────────────────────────────────────────────────────

  // GET /api/courses
  app.get("/api/courses", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUser((req as any).userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.role === "instructor" || user.role === "admin") {
      const instructorCourses = await storage.getCoursesByInstructor(user.id);
      res.json(instructorCourses);
    } else {
      const published = await storage.getPublishedCourses();
      res.json(published);
    }
  });

  // GET /api/courses/:id
  app.get("/api/courses/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid course ID" });
      return;
    }

    const course = await storage.getCourse(id);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const courseAssignments = await storage.getAssignmentsByCourse(id);
    res.json({ ...course, assignments: courseAssignments });
  });

  // POST /api/courses
  app.post(
    "/api/courses",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const user = await storage.getUser((req as any).userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const { title, description, language, duration, price } = req.body;
      if (!title || !description) {
        res.status(400).json({ error: "title and description are required" });
        return;
      }

      const course = await storage.createCourse({
        instructorId: user.id,
        title,
        description,
        language: language || "python",
        duration: duration || "6 weeks",
        price: price ?? 0,
        published: 0,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json(course);
    }
  );

  // PUT /api/courses/:id
  app.put(
    "/api/courses/:id",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid course ID" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(id);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      if (course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your course" });
        return;
      }

      const { title, description, language, duration, price } = req.body;
      const updated = await storage.updateCourse(id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(language !== undefined && { language }),
        ...(duration !== undefined && { duration }),
        ...(price !== undefined && { price }),
      });

      res.json(updated);
    }
  );

  // POST /api/courses/:id/publish
  app.post(
    "/api/courses/:id/publish",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid course ID" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(id);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      if (course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your course" });
        return;
      }

      const updated = await storage.updateCourse(id, {
        published: course.published === 1 ? 0 : 1,
      });

      res.json(updated);
    }
  );

  // ── Assignments ─────────────────────────────────────────────────────────────

  // GET /api/courses/:courseId/assignments
  app.get(
    "/api/courses/:courseId/assignments",
    requireAuth,
    async (req: Request, res: Response) => {
      const courseId = parseInt(req.params.courseId as string);
      if (isNaN(courseId)) {
        res.status(400).json({ error: "Invalid course ID" });
        return;
      }

      const courseAssignments = await storage.getAssignmentsByCourse(courseId);
      res.json(courseAssignments);
    }
  );

  // POST /api/courses/:courseId/assignments
  app.post(
    "/api/courses/:courseId/assignments",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const courseId = parseInt(req.params.courseId as string);
      if (isNaN(courseId)) {
        res.status(400).json({ error: "Invalid course ID" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(courseId);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      if (course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your course" });
        return;
      }

      const { title, instructions, starterCode, fileName, sortOrder } = req.body;
      if (!title || !instructions || !starterCode) {
        res.status(400).json({ error: "title, instructions, and starterCode are required" });
        return;
      }

      const assignment = await storage.createAssignment({
        courseId,
        title,
        instructions,
        starterCode,
        fileName: fileName || "main.py",
        sortOrder: sortOrder ?? 0,
      });

      res.status(201).json(assignment);
    }
  );

  // PUT /api/assignments/:id
  app.put(
    "/api/assignments/:id",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid assignment ID" });
        return;
      }

      const assignment = await storage.getAssignment(id);
      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(assignment.courseId);
      if (!course || course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your assignment" });
        return;
      }

      const { title, instructions, starterCode, fileName, sortOrder } = req.body;
      const updated = await storage.updateAssignment(id, {
        ...(title !== undefined && { title }),
        ...(instructions !== undefined && { instructions }),
        ...(starterCode !== undefined && { starterCode }),
        ...(fileName !== undefined && { fileName }),
        ...(sortOrder !== undefined && { sortOrder }),
      });

      res.json(updated);
    }
  );

  // DELETE /api/assignments/:id
  app.delete(
    "/api/assignments/:id",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid assignment ID" });
        return;
      }

      const assignment = await storage.getAssignment(id);
      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(assignment.courseId);
      if (!course || course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your assignment" });
        return;
      }

      await storage.deleteAssignment(id);
      res.json({ ok: true });
    }
  );

  // ── Enrollments ─────────────────────────────────────────────────────────────

  // POST /api/courses/:id/enroll
  app.post(
    "/api/courses/:id/enroll",
    requireAuth,
    async (req: Request, res: Response) => {
      const courseId = parseInt(req.params.id as string);
      if (isNaN(courseId)) {
        res.status(400).json({ error: "Invalid course ID" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      if (user.role !== "student") {
        res.status(403).json({ error: "Only students can enroll" });
        return;
      }

      const course = await storage.getCourse(courseId);
      if (!course || course.published !== 1) {
        res.status(404).json({ error: "Course not found or not published" });
        return;
      }

      const existing = await storage.getEnrollment(user.id, courseId);
      if (existing) {
        res.status(409).json({ error: "Already enrolled" });
        return;
      }

      const enrollment = await storage.createEnrollment({
        studentId: user.id,
        courseId,
        status: "active",
        paymentStatus: "free",
        enrolledAt: new Date().toISOString(),
      });

      res.status(201).json(enrollment);
    }
  );

  // GET /api/enrollments
  app.get(
    "/api/enrollments",
    requireAuth,
    async (req: Request, res: Response) => {
      const user = await storage.getUser((req as any).userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const studentEnrollments = await storage.getEnrollmentsByStudent(user.id);

      // Attach course info to each enrollment
      const withCourses = await Promise.all(
        studentEnrollments.map(async (enrollment) => {
          const course = await storage.getCourse(enrollment.courseId);
          return { ...enrollment, course };
        })
      );

      res.json(withCourses);
    }
  );

  // GET /api/courses/:id/students
  app.get(
    "/api/courses/:id/students",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const courseId = parseInt(req.params.id as string);
      if (isNaN(courseId)) {
        res.status(400).json({ error: "Invalid course ID" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(courseId);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      if (course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your course" });
        return;
      }

      const courseEnrollments = await storage.getEnrollmentsByCourse(courseId);
      const courseAssignments = await storage.getAssignmentsByCourse(courseId);

      const studentsWithStats = await Promise.all(
        courseEnrollments.map(async (enrollment) => {
          const student = await storage.getUser(enrollment.studentId);
          const studentSubmissions = await storage.getSubmissionsByStudent(
            enrollment.studentId
          );
          // Filter submissions to only this course
          const courseSubmissions = studentSubmissions.filter(
            (s) => s.courseId === courseId
          );

          const { password: _pw, ...safeStudent } = student!;
          return {
            enrollment,
            student: safeStudent,
            submissionCount: courseSubmissions.length,
            totalAssignments: courseAssignments.length,
            avgDefenseScore:
              courseSubmissions.length > 0
                ? Math.round(
                    courseSubmissions
                      .filter((s) => s.defenseScore !== null)
                      .reduce((acc, s) => acc + (s.defenseScore ?? 0), 0) /
                      (courseSubmissions.filter((s) => s.defenseScore !== null)
                        .length || 1)
                  )
                : null,
          };
        })
      );

      res.json(studentsWithStats);
    }
  );

  // ── Submissions ─────────────────────────────────────────────────────────────

  // POST /api/submissions
  app.post(
    "/api/submissions",
    requireAuth,
    async (req: Request, res: Response) => {
      const user = await storage.getUser((req as any).userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      if (user.role !== "student") {
        res.status(403).json({ error: "Only students can submit assignments" });
        return;
      }

      const { assignmentId, courseId, code, defenseScore, defenseAnswers } =
        req.body;
      if (!assignmentId || !courseId || !code) {
        res
          .status(400)
          .json({ error: "assignmentId, courseId, and code are required" });
        return;
      }

      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }

      const submission = await storage.createSubmission({
        assignmentId,
        studentId: user.id,
        courseId,
        code,
        defenseScore: defenseScore ?? null,
        defenseAnswers: defenseAnswers
          ? JSON.stringify(defenseAnswers)
          : null,
        submittedAt: new Date().toISOString(),
      });

      res.status(201).json(submission);
    }
  );

  // GET /api/courses/:courseId/assignments/:assignmentId/submissions
  app.get(
    "/api/courses/:courseId/assignments/:assignmentId/submissions",
    requireAuth,
    requireRole("instructor"),
    async (req: Request, res: Response) => {
      const courseId = parseInt(req.params.courseId as string);
      const assignmentId = parseInt(req.params.assignmentId as string);
      if (isNaN(courseId) || isNaN(assignmentId)) {
        res.status(400).json({ error: "Invalid IDs" });
        return;
      }

      const user = await storage.getUser((req as any).userId);
      const course = await storage.getCourse(courseId);
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      if (course.instructorId !== user!.id) {
        res.status(403).json({ error: "Not your course" });
        return;
      }

      const assignmentSubmissions =
        await storage.getSubmissionsByAssignment(assignmentId);

      // Attach student info to each submission
      const withStudents = await Promise.all(
        assignmentSubmissions.map(async (submission) => {
          const student = await storage.getUser(submission.studentId);
          const { password: _pw, ...safeStudent } = student!;
          return { ...submission, student: safeStudent };
        })
      );

      res.json(withStudents);
    }
  );

  // ── Code Execution ──────────────────────────────────────────────────────────

  // POST /api/run
  app.post("/api/run", async (req: Request, res: Response) => {
    const { code, input } = req.body;
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "No code provided" });
      return;
    }

    const tmpFile = join(tmpDir, `run_${Date.now()}.py`);
    writeFileSync(tmpFile, code);

    // Use provided input or fallback to sensible defaults
    const stdinInput = typeof input === "string" ? input : "test input\n42\n+\n";

    exec(
      `echo "${stdinInput.replace(/"/g, '\\"')}" | python3 "${tmpFile}" 2>&1`,
      { timeout: 10000, maxBuffer: 1024 * 100 },
      (error, stdout, stderr) => {
        try {
          require("fs").unlinkSync(tmpFile);
        } catch {}

        if (error && error.killed) {
          res.json({
            output: stdout || "",
            error: "Program timed out (10 second limit).",
          });
          return;
        }

        const output = stdout || "";
        const errorOutput = stderr || "";

        const lines = output.split("\n");
        const errorLines: string[] = [];
        const outputLines: string[] = [];
        let inTraceback = false;

        for (const line of lines) {
          if (
            line.includes("Traceback") ||
            line.includes("Error:") ||
            line.includes("SyntaxError") ||
            inTraceback
          ) {
            inTraceback = true;
            errorLines.push(line);
            if (
              line.match(
                /^\w+Error:|^\w+Warning:|^SyntaxError:|^IndentationError:|^TabError:|^NameError:|^TypeError:|^ValueError:/
              )
            ) {
              inTraceback = false;
            }
          } else {
            outputLines.push(line);
          }
        }

        res.json({
          output: outputLines.join("\n"),
          error:
            errorLines.length > 0 ? errorLines.join("\n") : errorOutput || "",
        });
      }
    );
  });

  // ── AI Chat ─────────────────────────────────────────────────────────────────

  // POST /api/chat
  app.post("/api/chat", async (req: Request, res: Response) => {
    const { question, code, assignmentTitle, history } = req.body;
    if (!question) {
      res.status(400).json({ error: "No question provided" });
      return;
    }

    const client = getAnthropicClient();
    if (!client) {
      const response = getFallbackChatResponse(question, code);
      res.json({ response });
      return;
    }

    try {
      const systemPrompt = `You are a friendly Python tutor helping a beginner student who is learning to program. The student is working on an assignment called "${assignmentTitle}".

IMPORTANT RULES:
1. NEVER give the student the direct answer or write code for them
2. Help them understand concepts, fix syntax errors, and debug their thinking
3. If they ask you to write the code, politely decline and guide them instead
4. Explain error messages in simple terms
5. Use encouraging language
6. Keep responses brief (2-3 sentences max)
7. If they share code, you can point out issues without fixing them
8. Focus on teaching them to think through the problem

The student's current code:
\`\`\`python
${code || "(no code written yet)"}
\`\`\``;

      const messages: Array<{ role: "user" | "assistant"; content: string }> =
        [];
      if (history && Array.isArray(history)) {
        for (const msg of history.slice(-6)) {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
      messages.push({ role: "user", content: question });

      const message = await client.messages.create({
        model: "claude_haiku_4_5",
        max_tokens: 300,
        system: systemPrompt,
        messages,
      });

      const responseText =
        message.content[0].type === "text"
          ? message.content[0].text
          : "I couldn't generate a response. Try asking differently.";

      res.json({ response: responseText });
    } catch (error: any) {
      console.error("Chat API error:", error.message);
      const response = getFallbackChatResponse(question, code);
      res.json({ response });
    }
  });

  // ── Code Defense ────────────────────────────────────────────────────────────

  // POST /api/defense/generate
  app.post("/api/defense/generate", async (req: Request, res: Response) => {
    const { code, assignmentTitle } = req.body;
    if (!code) {
      res.status(400).json({ error: "No code provided" });
      return;
    }

    const client = getAnthropicClient();
    if (!client) {
      const questions = getFallbackDefenseQuestions(code);
      res.json({ questions });
      return;
    }

    try {
      const message = await client.messages.create({
        model: "claude_haiku_4_5",
        max_tokens: 500,
        system: `You are generating "Code Defense" questions for a Python programming student. The student submitted code for an assignment called "${assignmentTitle}". Generate exactly 3 questions that test whether the student actually wrote and understands the code.

Questions should:
- Be specific to the actual code they wrote
- Test understanding of what the code does, not memorization
- Be answerable in 1-2 sentences if the student truly wrote the code
- Cover different aspects: logic, syntax, and purpose

Respond with ONLY a JSON array of 3 question strings, like:
["Question 1?", "Question 2?", "Question 3?"]`,
        messages: [
          {
            role: "user",
            content: `Here is the student's code:\n\`\`\`python\n${code}\n\`\`\`\n\nGenerate 3 defense questions.`,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "[]";

      try {
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        const questions = parsed.map((q: string, i: number) => ({
          question: q,
          id: i,
        }));
        res.json({ questions });
      } catch {
        const questions = getFallbackDefenseQuestions(code);
        res.json({ questions });
      }
    } catch (error: any) {
      console.error("Defense generate error:", error.message);
      const questions = getFallbackDefenseQuestions(code);
      res.json({ questions });
    }
  });

  // POST /api/defense/evaluate
  app.post("/api/defense/evaluate", async (req: Request, res: Response) => {
    const { code, questions, answers, assignmentTitle } = req.body;
    if (!code || !questions || !answers) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const client = getAnthropicClient();
    if (!client) {
      const result = getFallbackDefenseEvaluation(questions, answers);
      res.json(result);
      return;
    }

    try {
      const qaPairs = questions
        .map(
          (q: string, i: number) =>
            `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || "(no answer)"}`
        )
        .join("\n\n");

      const message = await client.messages.create({
        model: "claude_haiku_4_5",
        max_tokens: 800,
        system: `You are evaluating a student's "Code Defense" for a Python assignment called "${assignmentTitle}". The student must demonstrate they understand the code they submitted. Be fair but thorough.

Evaluate each answer and respond with ONLY a JSON object in this exact format:
{
  "score": <number of correct answers>,
  "total": ${questions.length},
  "feedback": [
    {
      "question": "the question",
      "answer": "student's answer",
      "correct": true/false,
      "explanation": "brief explanation of why correct/incorrect"
    }
  ]
}

A response is "correct" if the student shows genuine understanding, even if not perfectly worded. Be generous with partial understanding.`,
        messages: [
          {
            role: "user",
            content: `Student's code:\n\`\`\`python\n${code}\n\`\`\`\n\nQuestions and answers:\n${qaPairs}\n\nEvaluate the student's understanding.`,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "{}";

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        if (parsed && parsed.feedback) {
          res.json(parsed);
        } else {
          const result = getFallbackDefenseEvaluation(questions, answers);
          res.json(result);
        }
      } catch {
        const result = getFallbackDefenseEvaluation(questions, answers);
        res.json(result);
      }
    } catch (error: any) {
      console.error("Defense evaluate error:", error.message);
      const result = getFallbackDefenseEvaluation(questions, answers);
      res.json(result);
    }
  });

  return httpServer;
}
