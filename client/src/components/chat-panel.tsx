import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Assignment } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles } from "lucide-react";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

interface ChatPanelProps {
  code: string;
  assignment: Assignment | undefined;
}

export function ChatPanel({ code, assignment }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "Hi, I'm your Python tutor. I can help you with syntax questions, error messages, and understanding Python concepts. I won't give you the answer directly, but I'll guide you in the right direction.",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiRequest("POST", "/api/chat", {
        question,
        code,
        assignmentTitle: assignment?.title || "",
        history: messages
          .filter((m) => m.role !== "system")
          .slice(-6)
          .map((m) => ({ role: m.role, content: m.content })),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble right now. Try again in a moment.",
        },
      ]);
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    chatMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "What does input() do?",
    "How do I fix a SyntaxError?",
    "What is a variable?",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-8 flex items-center px-3 border-b border-border bg-card/30 shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary mr-2" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          AI Tutor
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3" data-testid="chat-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message flex gap-2 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user"
                    ? "bg-blue-500/20 text-blue-400"
                    : msg.role === "system"
                    ? "bg-primary/20 text-primary"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </div>
              <div
                className={`flex-1 text-xs leading-relaxed p-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-500/10 text-foreground"
                    : "bg-muted text-foreground/80"
                }`}
                data-testid={`chat-message-${i}`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {chatMutation.isPending && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/20 text-primary shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="bg-muted p-2 rounded-lg text-xs text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(q);
                inputRef.current?.focus();
              }}
              className="text-[10px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              data-testid={`suggest-${i}`}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-2 border-t border-border" data-testid="chat-input-area">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Python..."
            rows={1}
            className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            data-testid="input-chat"
          />
          <Button
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            data-testid="button-send-chat"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
