import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Assignment } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

type DefenseQuestion = {
  question: string;
  id: number;
};

type DefenseResult = {
  score: number;
  total: number;
  feedback: { question: string; answer: string; correct: boolean; explanation: string }[];
};

interface CodeDefenseDialogProps {
  code: string;
  assignment: Assignment | undefined;
  open: boolean;
  onClose: () => void;
}

export function CodeDefenseDialog({
  code,
  assignment,
  open,
  onClose,
}: CodeDefenseDialogProps) {
  const [phase, setPhase] = useState<"loading" | "questions" | "results">(
    "loading"
  );
  const [questions, setQuestions] = useState<DefenseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<DefenseResult | null>(null);

  // Generate questions
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/defense/generate", {
        code,
        assignmentTitle: assignment?.title || "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      setPhase("questions");
    },
  });

  // Evaluate answers
  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/defense/evaluate", {
        code,
        questions: questions.map((q) => q.question),
        answers: questions.map((q) => answers[q.id] || ""),
        assignmentTitle: assignment?.title || "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setPhase("results");
    },
  });

  // Start generating when opened
  useState(() => {
    generateMutation.mutate();
  });

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  const handleSubmitAnswers = () => {
    if (!allAnswered) return;
    evaluateMutation.mutate();
  };

  const getScoreColor = (score: number, total: number) => {
    const pct = score / total;
    if (pct >= 0.8) return "text-green-400";
    if (pct >= 0.5) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreMessage = (score: number, total: number) => {
    const pct = score / total;
    if (pct >= 0.8) return "Great job. You clearly understand your code.";
    if (pct >= 0.5) return "Decent understanding, but review the areas you missed.";
    return "It looks like you may need to review your code more carefully.";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border" data-testid="defense-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Code Defense
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Answer these questions about your code to demonstrate you understand it.
          </DialogDescription>
        </DialogHeader>

        {/* Loading Phase */}
        {phase === "loading" && (
          <div className="py-8 flex flex-col items-center gap-3" data-testid="defense-loading">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Generating questions based on your code...
            </p>
          </div>
        )}

        {/* Questions Phase */}
        {phase === "questions" && (
          <div className="space-y-4" data-testid="defense-questions">
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span>
                  <span>{q.question}</span>
                </label>
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  placeholder="Type your answer..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  data-testid={`input-defense-${i}`}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={onClose} data-testid="button-cancel-defense">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitAnswers}
                disabled={!allAnswered || evaluateMutation.isPending}
                data-testid="button-submit-defense"
              >
                {evaluateMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    Evaluating...
                  </>
                ) : (
                  "Submit Answers"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {phase === "results" && results && (
          <div className="space-y-4" data-testid="defense-results">
            {/* Score */}
            <div className="text-center py-3">
              <div
                className={`text-4xl font-bold ${getScoreColor(
                  results.score,
                  results.total
                )}`}
                data-testid="text-defense-score"
              >
                {results.score} / {results.total}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {getScoreMessage(results.score, results.total)}
              </p>
            </div>

            {/* Feedback */}
            <div className="space-y-3">
              {results.feedback.map((fb, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    fb.correct
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-red-500/30 bg-red-500/5"
                  }`}
                  data-testid={`defense-feedback-${i}`}
                >
                  <div className="flex items-start gap-2">
                    {fb.correct ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">{fb.question}</p>
                      <p className="text-xs text-muted-foreground">
                        Your answer: {fb.answer}
                      </p>
                      <p className="text-xs text-foreground/70">{fb.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={onClose} data-testid="button-close-defense">
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {generateMutation.isError && phase === "loading" && (
          <div className="py-6 flex flex-col items-center gap-3" data-testid="defense-error">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Failed to generate defense questions. Try again.
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => generateMutation.mutate()}
            >
              Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
