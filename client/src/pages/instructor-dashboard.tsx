import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import type { Course, Assignment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  BookOpen,
  Users,
  FileCode2,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  Code2,
  Trash2,
  GraduationCap,
  ClipboardList,
} from "lucide-react";

type CourseWithAssignments = Course & { assignments?: Assignment[] };
type StudentStat = {
  student: { id: number; email: string; name: string; role: string };
  enrollment: { id: number; status: string };
  submissionCount: number;
  totalAssignments: number;
  avgDefenseScore: number | null;
};

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [showStudents, setShowStudents] = useState(false);
  const [studentsCourseId, setStudentsCourseId] = useState<number | null>(null);

  // Form state
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseLang, setCourseLang] = useState("python");
  const [courseDuration, setCourseDuration] = useState("6 weeks");

  const [assignTitle, setAssignTitle] = useState("");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [assignStarter, setAssignStarter] = useState("# Write your code here\n");
  const [assignFileName, setAssignFileName] = useState("main.py");

  // Queries
  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: courseDetail } = useQuery<CourseWithAssignments>({
    queryKey: ["/api/courses", selectedCourseId],
    enabled: selectedCourseId !== null,
  });

  const { data: students, isLoading: studentsLoading } = useQuery<StudentStat[]>({
    queryKey: ["/api/courses", studentsCourseId, "students"],
    enabled: studentsCourseId !== null && showStudents,
  });

  // Mutations
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/courses", {
        title: courseTitle,
        description: courseDesc,
        language: courseLang,
        duration: courseDuration,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setShowCreateCourse(false);
      setCourseTitle("");
      setCourseDesc("");
      toast({ title: "Course created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await apiRequest("POST", `/api/courses/${courseId}/publish`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      if (selectedCourseId) {
        queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourseId] });
      }
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const courseId = selectedCourseId;
      const res = await apiRequest("POST", `/api/courses/${courseId}/assignments`, {
        title: assignTitle,
        instructions: assignInstructions,
        starterCode: assignStarter,
        fileName: assignFileName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/courses", selectedCourseId],
      });
      setShowCreateAssignment(false);
      setAssignTitle("");
      setAssignInstructions("");
      setAssignStarter("# Write your code here\n");
      setAssignFileName("main.py");
      toast({ title: "Assignment created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/courses", selectedCourseId],
      });
      toast({ title: "Assignment deleted" });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background" data-testid="instructor-dashboard">
      {/* Top nav */}
      <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">PyLab</span>
          </div>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground">Instructor</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user.name}</span>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Courses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create and manage courses for your students
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowCreateCourse(true)}
            data-testid="button-create-course"
          >
            <Plus className="w-3.5 h-3.5" />
            New Course
          </Button>
        </div>

        {/* Course List */}
        {coursesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <Card
                key={course.id}
                className={`border-border bg-card cursor-pointer transition-colors hover:border-primary/40 ${
                  selectedCourseId === course.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedCourseId(course.id)}
                data-testid={`card-course-${course.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-sm">{course.title}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={course.published ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {course.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {course.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      {course.duration}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-[10px] gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        publishMutation.mutate(course.id);
                      }}
                      data-testid={`button-publish-${course.id}`}
                    >
                      {course.published ? (
                        <>
                          <EyeOff className="w-3 h-3" /> Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Publish
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-[10px] gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStudentsCourseId(course.id);
                        setShowStudents(true);
                      }}
                      data-testid={`button-students-${course.id}`}
                    >
                      <Users className="w-3 h-3" />
                      Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border bg-card border-dashed">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No courses yet. Create your first course to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Selected Course Assignments */}
        {selectedCourseId && courseDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Assignments — {courseDetail.title}
              </h3>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowCreateAssignment(true)}
                data-testid="button-create-assignment"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Assignment
              </Button>
            </div>

            {courseDetail.assignments && courseDetail.assignments.length > 0 ? (
              <div className="space-y-2">
                {courseDetail.assignments.map((a, idx) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50"
                    data-testid={`assignment-row-${a.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {a.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <FileCode2 className="w-3 h-3" />
                          {a.fileName}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAssignmentMutation.mutate(a.id)}
                      data-testid={`button-delete-assignment-${a.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                No assignments yet. Add one to get started.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Course Dialog */}
      <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
        <DialogContent className="max-w-md bg-card border-border" data-testid="dialog-create-course">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Course</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new course for your students.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCourseMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Introduction to Python"
                className="h-9 text-sm bg-background"
                required
                data-testid="input-course-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <textarea
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="A beginner-friendly Python course..."
                rows={3}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                required
                data-testid="input-course-desc"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Language</Label>
                <Input
                  value={courseLang}
                  onChange={(e) => setCourseLang(e.target.value)}
                  className="h-9 text-sm bg-background"
                  data-testid="input-course-lang"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Duration</Label>
                <Input
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(e.target.value)}
                  className="h-9 text-sm bg-background"
                  data-testid="input-course-duration"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateCourse(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createCourseMutation.isPending}
                data-testid="button-submit-course"
              >
                {createCourseMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Create Course"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateAssignment} onOpenChange={setShowCreateAssignment}>
        <DialogContent className="max-w-lg bg-card border-border" data-testid="dialog-create-assignment">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Assignment</DialogTitle>
            <DialogDescription className="text-xs">
              Add an assignment to your course.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAssignmentMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <Input
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="Hello World"
                className="h-9 text-sm bg-background"
                required
                data-testid="input-assign-title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Instructions (Markdown)</Label>
              <textarea
                value={assignInstructions}
                onChange={(e) => setAssignInstructions(e.target.value)}
                placeholder="# Assignment Title&#10;&#10;## Overview&#10;Describe what the student needs to do..."
                rows={5}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                required
                data-testid="input-assign-instructions"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Starter Code</Label>
              <textarea
                value={assignStarter}
                onChange={(e) => setAssignStarter(e.target.value)}
                rows={4}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                data-testid="input-assign-starter"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">File Name</Label>
              <Input
                value={assignFileName}
                onChange={(e) => setAssignFileName(e.target.value)}
                className="h-9 text-sm bg-background"
                data-testid="input-assign-filename"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateAssignment(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAssignmentMutation.isPending}
                data-testid="button-submit-assignment"
              >
                {createAssignmentMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Create Assignment"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Students Dialog */}
      <Dialog open={showStudents} onOpenChange={setShowStudents}>
        <DialogContent className="max-w-md bg-card border-border" data-testid="dialog-students">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Enrolled Students
            </DialogTitle>
            <DialogDescription className="text-xs">
              Students enrolled in this course and their progress.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-64">
            {studentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded-md" />
                ))}
              </div>
            ) : students && students.length > 0 ? (
              <div className="space-y-2">
                {students.map((s) => (
                  <div
                    key={s.student.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                    data-testid={`student-row-${s.student.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {s.student.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.student.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-foreground">
                        {s.submissionCount}/{s.totalAssignments} submitted
                      </p>
                      {s.avgDefenseScore !== null && (
                        <p className="text-[10px] text-muted-foreground">
                          Defense avg: {s.avgDefenseScore}/{s.totalAssignments > 0 ? 3 : 0}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No students enrolled yet.
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
