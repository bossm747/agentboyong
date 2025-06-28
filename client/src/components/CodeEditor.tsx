import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeEditorProps {
  content: string;
  language: string;
  onSave: (content: string) => void;
}

export default function CodeEditor({ content, language, onSave }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentContent, setCurrentContent] = useState(content);
  const [monaco, setMonaco] = useState<any>(null);
  const [editor, setEditor] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load Monaco Editor
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js';
    script.onload = () => {
      (window as any).require.config({
        paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' }
      });
      
      (window as any).require(['vs/editor/editor.main'], () => {
        setMonaco((window as any).monaco);
      });
    };
    
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (monaco && editorRef.current && !editor) {
      // Set up dark theme
      monaco.editor.defineTheme('sandbox-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955' },
          { token: 'keyword', foreground: 'C586C0' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'function', foreground: 'DCDCAA' },
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#cccccc',
          'editorLineNumber.foreground': '#858585',
          'editor.selectionBackground': '#264f78',
          'editor.lineHighlightBackground': '#2a2d2e',
        }
      });

      const newEditor = monaco.editor.create(editorRef.current, {
        value: content,
        language: language,
        theme: 'sandbox-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        lineNumbers: 'on',
        folding: true,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
      });

      newEditor.onDidChangeModelContent(() => {
        setCurrentContent(newEditor.getValue());
      });

      // Add keyboard shortcut for save
      newEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        handleSave();
      });

      setEditor(newEditor);
    }
  }, [monaco, content, language]);

  useEffect(() => {
    if (editor && content !== currentContent) {
      const model = editor.getModel();
      if (model) {
        model.setValue(content);
        setCurrentContent(content);
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor && monaco) {
      monaco.editor.setModelLanguage(editor.getModel(), language);
    }
  }, [language, editor, monaco]);

  const handleSave = () => {
    onSave(currentContent);
    toast({
      title: "File saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      toast({
        title: "Copied to clipboard",
        description: "Code has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy code to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${getFileExtension(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 relative">
      <div className="absolute inset-0 flex flex-col">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-panel-bg border-b border-border-color">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-secondary capitalize">{language}</span>
            <span className="text-sm text-text-secondary">•</span>
            <span className="text-sm text-text-secondary">UTF-8</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-text-secondary hover:text-text-primary"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-text-secondary hover:text-text-primary"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="text-text-secondary hover:text-text-primary"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div ref={editorRef} className="flex-1" />

        {/* Status Bar */}
        <div className="bg-panel-bg border-t border-border-color px-4 py-1 flex items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center space-x-4">
            <span className="capitalize">{language}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Ln 1, Col 1</span>
            <span>Spaces: 4</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md',
    plaintext: 'txt',
    xml: 'xml',
    yaml: 'yml',
  };
  return extensions[language] || 'txt';
}
