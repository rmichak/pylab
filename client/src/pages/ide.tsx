import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useParams } from "wouter";
import type { Assignment, Course } from "@shared/schema";
import { CodeEditor } from "@/components/code-editor";
import { InstructionsPanel } from "@/components/instructions-panel";
import { TerminalPanel } from "@/components/terminal-panel";
import { ChatPanel } from "@/components/chat-panel";
import { CodeDefenseDialog } from "@/components/code-defense-dialog";
import { FileExplorer } from "@/components/file-explorer";
import { useToast } from "@/hooks/use-toast";
import {
  FileCode2,
  BookOpen,
  MessageSquare,
  Terminal as TerminalIcon,
  Shield,
  Play,
  Camera,
  Trash2,
  ArrowLeft,
  Code2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TerminalLine = {
  text: string;
  type: "output" | "error" | "system" | "input";
};

type CourseWithAssignments = Course & { assignments: Assignment[] };

export default function IDE() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ courseId?: string }>();
  const courseId = params?.courseId ? parseInt(params.courseId) : null;

  const [activeTab, setActiveTab] = useState<
    "instructions" | "explorer" | "chat" | "defense"
  >("instructions");
  const [code, setCode] = useState("");
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { text: "PyLab Terminal Ready", type: "system" },
    { text: "Type your code above and click Run to execute.", type: "system" },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDefense, setShowDefense] = useState(false);
  const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0);

  // Fetch course + assignments
  const { data: courseData, isLoading: courseLoading } =
    useQuery<CourseWithAssignments>({
      queryKey: ["/api/courses", courseId],
      enabled: courseId !== null,
    });

  const assignments = courseData?.assignments || [];
  const currentAssignment = assignments[currentAssignmentIndex] || undefined;

  useEffect(() => {
    if (currentAssignment?.starterCode && !code) {
      setCode(currentAssignment.starterCode);
    }
  }, [currentAssignment?.id]);

  const runCodeMutation = useMutation({
    mutationFn: async (sourceCode: string) => {
      const res = await apiRequest("POST", "/api/run", { code: sourceCode });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.output) {
        const lines = data.output.split("\n").filter((l: string) => l !== "");
        lines.forEach((line: string) => {
          setTerminalLines((prev) => [...prev, { text: line, type: "output" }]);
        });
      }
      if (data.error) {
        const errLines = data.error
          .split("\n")
          .filter((l: string) => l !== "");
        errLines.forEach((line: string) => {
          setTerminalLines((prev) => [...prev, { text: line, type: "error" }]);
        });
      }
      setIsRunning(false);
    },
    onError: (error: Error) => {
      setTerminalLines((prev) => [
        ...prev,
        { text: `Error: ${error.message}`, type: "error" },
      ]);
      setIsRunning(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: {
      defenseScore?: number;
      defenseAnswers?: string[];
    }) => {
      const res = await apiRequest("POST", "/api/submissions", {
        assignmentId: currentAssignment?.id,
        courseId,
        code,
        defenseScore: data.defenseScore,
        defenseAnswers: data.defenseAnswers,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Assignment submitted" });
    },
  });

  const handleRun = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setTerminalLines((prev) => [
      ...prev,
      {
        text: `$ python ${currentAssignment?.fileName || "main.py"}`,
        type: "system",
      },
    ]);
    runCodeMutation.mutate(code);
  }, [code, isRunning, currentAssignment]);

  const handleClear = () => {
    setTerminalLines([{ text: "Terminal cleared.", type: "system" }]);
  };

  const handleCaptureOutput = () => {
    const outputText = terminalLines
      .filter((l) => l.type === "output" || l.type === "error")
      .map((l) => l.text)
      .join("\n");
    if (!outputText) {
      toast({
        title: "No output to capture",
        description: "Run your code first to generate output.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Output Captured",
      description: "Terminal output has been saved.",
    });
  };

  const handleSubmitDefense = () => {
    if (!code.trim()) {
      toast({
        title: "No code to defend",
        description: "Write some code before submitting for defense.",
        variant: "destructive",
      });
      return;
    }
    setShowDefense(true);
  };

  const handleSelectAssignment = (index: number) => {
    setCurrentAssignmentIndex(index);
    setCode("");
    setTerminalLines([
      { text: "PyLab Terminal Ready", type: "system" },
      {
        text: "Assignment loaded. Write your code and click Run.",
        type: "system",
      },
    ]);
    setActiveTab("instructions");
  };

  const handleBack = () => {
    if (user?.role === "instructor") {
      navigate("/instructor");
    } else {
      navigate("/student");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (courseLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">
          Loading course...
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">Course not found</p>
          <Button size="sm" onClick={handleBack} data-testid="button-back-error">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-screen flex flex-col bg-background overflow-hidden"
      data-testid="ide-container"
    >
      {/* Top Bar */}
      <header
        className="h-10 flex items-center justify-between px-4 border-b border-border bg-card shrink-0"
        data-testid="header"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {courseData.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        <h1
          className="text-sm font-semibold text-foreground"
          data-testid="assignment-title"
        >
          {currentAssignment?.title || "No Assignment"}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleSubmitDefense}
            data-testid="button-defend"
          >
            <Shield className="w-3.5 h-3.5" />
            Code Defense
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={handleLogout}
              data-testid="button-logout-ide"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Icon Sidebar */}
        <nav
          className="w-12 bg-card border-r border-border flex flex-col items-center py-3 gap-1 shrink-0"
          data-testid="nav-sidebar"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("explorer")}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                  activeTab === "explorer"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-testid="nav-explorer"
              >
                <FileCode2 className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Files</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("instructions")}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                  activeTab === "instructions"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-testid="nav-instructions"
              >
                <BookOpen className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Instructions</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTab("chat")}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                  activeTab === "chat"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-testid="nav-chat"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">AI Tutor</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSubmitDefense}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                  activeTab === "defense"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                data-testid="nav-defense"
              >
                <Shield className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Code Defense</TooltipContent>
          </Tooltip>
        </nav>

        {/* Left Panel */}
        <aside
          className="w-80 border-r border-border flex flex-col min-h-0 shrink-0"
          data-testid="left-panel"
        >
          {activeTab === "explorer" && (
            <FileExplorer
              assignment={currentAssignment}
              assignments={assignments}
              onSelectAssignment={(id) => {
                const idx = assignments.findIndex((a) => a.id === id);
                if (idx >= 0) handleSelectAssignment(idx);
              }}
              currentId={currentAssignment?.id || 0}
            />
          )}
          {activeTab === "instructions" && (
            <InstructionsPanel assignment={currentAssignment} />
          )}
          {activeTab === "chat" && (
            <ChatPanel code={code} assignment={currentAssignment} />
          )}
        </aside>

        {/* Main Editor + Terminal */}
        <main
          className="flex-1 flex flex-col min-h-0 min-w-0"
          data-testid="main-area"
        >
          {/* Editor tab bar */}
          <div
            className="h-9 flex items-center border-b border-border bg-card/50 px-2 shrink-0"
            data-testid="editor-tabs"
          >
            <div className="flex items-center gap-1 px-3 py-1 bg-background rounded-t-md border border-border border-b-0 text-xs text-foreground">
              <FileCode2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground mr-1">Saved</span>
              <span>{currentAssignment?.fileName || "main.py"}</span>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 min-h-0" data-testid="code-editor-wrapper">
            <CodeEditor
              value={code}
              onChange={setCode}
              fileName={currentAssignment?.fileName || "main.py"}
            />
          </div>

          {/* Terminal */}
          <div
            className="h-[220px] border-t border-border flex flex-col shrink-0"
            data-testid="terminal-section"
          >
            <div className="h-8 flex items-center justify-between px-3 bg-card/50 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>TERMINAL</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 text-xs gap-1 px-2"
                  onClick={handleRun}
                  disabled={isRunning}
                  data-testid="button-run"
                >
                  <Play className="w-3 h-3" />
                  Run
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-xs gap-1 px-2"
                  onClick={handleCaptureOutput}
                  data-testid="button-capture"
                >
                  <Camera className="w-3 h-3" />
                  Capture Output
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 text-xs gap-1 px-2"
                  onClick={handleClear}
                  data-testid="button-clear"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
              </div>
            </div>
            <TerminalPanel lines={terminalLines} isRunning={isRunning} />
          </div>
        </main>
      </div>

      {/* Code Defense Dialog */}
      {showDefense && (
        <CodeDefenseDialog
          code={code}
          assignment={currentAssignment}
          open={showDefense}
          onClose={() => setShowDefense(false)}
        />
      )}
    </div>
  );
}
