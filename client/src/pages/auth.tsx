import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Code2,
  GraduationCap,
  BookOpenCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "instructor">("student");
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        const user = await login({ email, password });
        navigate(user.role === "instructor" ? "/instructor" : "/student");
      } else {
        if (!name.trim()) {
          toast({
            title: "Name required",
            description: "Please enter your full name.",
            variant: "destructive",
          });
          return;
        }
        const user = await register({ email, password, name, role });
        navigate(user.role === "instructor" ? "/instructor" : "/student");
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong";
      toast({
        title: mode === "login" ? "Login failed" : "Registration failed",
        description: msg.includes(":")
          ? msg.split(":").slice(1).join(":").trim()
          : msg,
        variant: "destructive",
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8 items-center">
        {/* Branding Side */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              PyLab
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto lg:mx-0 leading-relaxed">
            A hands-on Python learning environment. Write code, get real-time
            feedback, and prove your understanding through code defense.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span>Students: browse courses, complete assignments, learn by doing</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <BookOpenCheck className="w-4 h-4 text-primary shrink-0" />
              <span>Instructors: create courses, manage assignments, track progress</span>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="rounded-lg border border-border bg-card/50 p-4 text-xs space-y-2 max-w-sm mx-auto lg:mx-0">
            <p className="font-medium text-foreground">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEmail("instructor@pylab.dev");
                  setPassword("demo123");
                  setMode("login");
                }}
                className="text-left p-2 rounded-md border border-border hover:bg-muted transition-colors"
                data-testid="button-demo-instructor"
              >
                <span className="text-primary font-medium block">Instructor</span>
                <span className="text-muted-foreground">instructor@pylab.dev</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("student@pylab.dev");
                  setPassword("demo123");
                  setMode("login");
                }}
                className="text-left p-2 rounded-md border border-border hover:bg-muted transition-colors"
                data-testid="button-demo-student"
              >
                <span className="text-primary font-medium block">Student</span>
                <span className="text-muted-foreground">student@pylab.dev</span>
              </button>
            </div>
            <p className="text-muted-foreground">Password: demo123</p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="w-full max-w-sm border-border bg-card" data-testid="auth-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription className="text-xs">
              {mode === "login"
                ? "Sign in to access your courses"
                : "Choose your role to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Smith"
                      className="h-9 text-sm bg-background"
                      data-testid="input-name"
                    />
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs">I am a...</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          role === "student"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                        data-testid="button-role-student"
                      >
                        <GraduationCap
                          className={`w-5 h-5 mb-1 ${
                            role === "student"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-medium block">Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("instructor")}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          role === "instructor"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                        data-testid="button-role-instructor"
                      >
                        <BookOpenCheck
                          className={`w-5 h-5 mb-1 ${
                            role === "instructor"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-medium block">Instructor</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-9 text-sm bg-background"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="h-9 text-sm bg-background"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9 text-sm gap-2"
                disabled={isPending}
                data-testid="button-submit-auth"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-toggle-mode"
                >
                  {mode === "login"
                    ? "Don't have an account? Register"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
