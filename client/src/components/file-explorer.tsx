import type { Assignment } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode2, FolderOpen, ChevronRight } from "lucide-react";

interface FileExplorerProps {
  assignment: Assignment | undefined;
  assignments: Assignment[];
  onSelectAssignment: (id: number) => void;
  currentId: number;
}

export function FileExplorer({
  assignment,
  assignments,
  onSelectAssignment,
  currentId,
}: FileExplorerProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-8 flex items-center px-3 border-b border-border bg-card/30 shrink-0">
        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground mr-2" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Explorer
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2" data-testid="file-explorer">
          {/* Current file */}
          {assignment && (
            <div className="mb-3">
              <div className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wide">
                Current File
              </div>
              <div
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 text-primary text-sm cursor-default"
                data-testid={`file-current-${assignment.id}`}
              >
                <FileCode2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{assignment.fileName}</span>
              </div>
            </div>
          )}

          {/* Assignment list */}
          {assignments.length > 1 && (
            <div>
              <div className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wide">
                Assignments
              </div>
              {assignments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onSelectAssignment(a.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
                    a.id === currentId
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`file-assignment-${a.id}`}
                >
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span className="truncate">{a.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
