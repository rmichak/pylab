import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, indentWithTab, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets } from "@codemirror/autocomplete";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
}

export function CodeEditor({ value, onChange, fileName }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { toast } = useToast();
  const isInternalChange = useRef(false);

  // Paste protection: block paste events
  const handlePaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Paste Blocked",
      description: "You must type your code manually. Pasting is not allowed in this environment.",
      variant: "destructive",
    });
    return false;
  }, [toast]);

  // Also block drop events (drag-and-drop text)
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "Drop Blocked",
      description: "Drag and drop is not allowed. Please type your code manually.",
      variant: "destructive",
    });
    return false;
  }, [toast]);

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        isInternalChange.current = true;
        onChange(update.state.doc.toString());
      }
    });

    // Block paste at the CodeMirror transaction level
    const pasteFilter = EditorState.transactionFilter.of((tr) => {
      if (tr.isUserEvent("input.paste")) {
        return [];
      }
      return tr;
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        history(),
        autocompletion(),
        python(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        updateListener,
        pasteFilter,
        EditorView.theme({
          "&": {
            fontSize: "14px",
          },
          ".cm-content": {
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            caretColor: "hsl(142, 60%, 55%)",
          },
          ".cm-cursor": {
            borderLeftColor: "hsl(142, 60%, 55%)",
          },
        }),
        // Disable paste via DOM event handling
        EditorView.domEventHandlers({
          paste(event) {
            event.preventDefault();
            return true;
          },
          drop(event) {
            event.preventDefault();
            return true;
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Additional DOM-level paste protection
    const el = editorRef.current;
    el.addEventListener("paste", handlePaste, true);
    el.addEventListener("drop", handleDrop, true);

    return () => {
      el.removeEventListener("paste", handlePaste, true);
      el.removeEventListener("drop", handleDrop, true);
      view.destroy();
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (viewRef.current && !isInternalChange.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
    isInternalChange.current = false;
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-auto bg-background"
      data-testid="code-editor"
      onPaste={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}
