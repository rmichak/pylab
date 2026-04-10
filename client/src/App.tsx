import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import InstructorDashboard from "@/pages/instructor-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import IDE from "@/pages/ide";

function ProtectedRoute({
  component: Component,
  requiredRole,
}: {
  component: React.ComponentType;
  requiredRole?: string;
}) {
  const { user, isLoading } = useAuth();

  // If still loading, show nothing briefly (not a full-screen spinner)
  if (isLoading) {
    return <div className="h-screen w-screen bg-background" />;
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <Redirect
        to={user.role === "instructor" ? "/instructor" : "/student"}
      />
    );
  }

  return <Component />;
}

function AuthRoute() {
  const { user, isLoading } = useAuth();

  // Don't block on loading — show login immediately, redirect if already authed
  if (user && !isLoading) {
    return (
      <Redirect
        to={user.role === "instructor" ? "/instructor" : "/student"}
      />
    );
  }

  return <AuthPage />;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={AuthRoute} />
      <Route path="/instructor">
        {() => (
          <ProtectedRoute
            component={InstructorDashboard}
            requiredRole="instructor"
          />
        )}
      </Route>
      <Route path="/student">
        {() => (
          <ProtectedRoute
            component={StudentDashboard}
            requiredRole="student"
          />
        )}
      </Route>
      <Route path="/ide/:courseId">
        {() => <ProtectedRoute component={IDE} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force dark mode
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
