import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import type { Course, Enrollment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Code2,
  LogOut,
  Play,
  CheckCircle2,
  Clock,
  GraduationCap,
  ClipboardList,
} from "lucide-react";

type EnrollmentWithCourse = Enrollment & { course: Course | null };

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Get published courses (available to browse)
  const { data: availableCourses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Get student's enrollments
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<
    EnrollmentWithCourse[]
  >({
    queryKey: ["/api/enrollments"],
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await apiRequest("POST", `/api/courses/${courseId}/enroll`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({ title: "Enrolled successfully" });
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      toast({
        title: "Enrollment failed",
        description: msg.includes(":")
          ? msg.split(":").slice(1).join(":").trim()
          : msg,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const enrolledCourseIds = new Set(
    enrollments?.map((e) => e.courseId) || []
  );

  const unenrolledCourses = (availableCourses || []).filter(
    (c) => !enrolledCourseIds.has(c.id)
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background" data-testid="student-dashboard">
      {/* Top nav */}
      <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Code2 className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">PyLab</span>
          </div>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs text-muted-foreground">My Courses</span>
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

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Enrolled Courses */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              My Courses
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Courses you're enrolled in
            </p>
          </div>

          {enrollmentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {enrollments.map((enrollment) =>
                enrollment.course ? (
                  <Card
                    key={enrollment.id}
                    className="border-border bg-card group cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() =>
                      navigate(
                        `/ide/${enrollment.courseId}`
                      )
                    }
                    data-testid={`card-enrolled-${enrollment.courseId}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">
                            {enrollment.course.title}
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-2">
                            {enrollment.course.description}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            enrollment.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px] shrink-0"
                        >
                          {enrollment.status === "completed" ? (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {enrollment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {enrollment.course.language}
                          </span>
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" />
                            {enrollment.course.duration}
                          </span>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-open-course-${enrollment.courseId}`}
                        >
                          <Play className="w-3 h-3" />
                          Open IDE
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null
              )}
            </div>
          ) : (
            <Card className="border-border bg-card border-dashed">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  You're not enrolled in any courses yet. Browse below to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Available Courses */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Browse Courses</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available courses to enroll in
            </p>
          </div>

          {coursesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-lg" />
              ))}
            </div>
          ) : unenrolledCourses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unenrolledCourses.map((course) => (
                <Card
                  key={course.id}
                  className="border-border bg-card"
                  data-testid={`card-browse-${course.id}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{course.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-3">
                      {course.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {course.language}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" />
                        {course.duration}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => enrollMutation.mutate(course.id)}
                      disabled={enrollMutation.isPending}
                      data-testid={`button-enroll-${course.id}`}
                    >
                      {enrollMutation.isPending ? (
                        <span className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full inline-block" />
                      ) : (
                        "Enroll"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              {enrollments && enrollments.length > 0
                ? "You're enrolled in all available courses."
                : "No courses available yet."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
