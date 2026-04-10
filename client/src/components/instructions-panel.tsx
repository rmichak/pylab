import type { Assignment } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen } from "lucide-react";

interface InstructionsPanelProps {
  assignment: Assignment | undefined;
}

function parseMarkdown(text: string): string {
  let html = text;

  // Code blocks first (before inline code)
  html = html.replace(/```(?:python|text)?\n([\s\S]*?)```/g, (_match, code) => {
    return `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}</code></pre>`;
  });

  // Headers (after code blocks so # inside code isn't caught)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline code (but not inside <pre> blocks)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs - lines that aren't already HTML elements
  const lines = html.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    if (trimmed.startsWith('<')) {
      result.push(line);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  return result.join('\n');
}

export function InstructionsPanel({ assignment }: InstructionsPanelProps) {
  if (!assignment) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No assignment loaded
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-8 flex items-center px-3 border-b border-border bg-card/30 shrink-0">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground mr-2" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Instructions
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4" data-testid="instructions-content">
          <div
            className="instructions-content"
            dangerouslySetInnerHTML={{
              __html: parseMarkdown(assignment.instructions),
            }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
