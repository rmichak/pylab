import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

type TerminalLine = {
  text: string;
  type: "output" | "error" | "system" | "input";
};

interface TerminalPanelProps {
  lines: TerminalLine[];
  isRunning: boolean;
}

export function TerminalPanel({ lines, isRunning }: TerminalPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "error":
        return "text-red-400";
      case "system":
        return "text-muted-foreground";
      case "input":
        return "text-blue-400";
      case "output":
      default:
        return "text-foreground";
    }
  };

  return (
    <ScrollArea className="flex-1 p-3" data-testid="terminal-output">
      <div className="space-y-0.5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`terminal-line ${getLineColor(line.type)} whitespace-pre-wrap break-all`}
          >
            {line.type === "system" && (
              <span className="text-primary mr-1">
                {line.text.startsWith("$") ? "" : "▸ "}
              </span>
            )}
            {line.text}
          </div>
        ))}
        {isRunning && (
          <div className="terminal-line text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
            Running...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
