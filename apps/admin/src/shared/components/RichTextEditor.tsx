// apps/admin/src/shared/components/RichTextEditor.tsx
import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "请输入内容...",
}) => {
  const quillRef = useRef<HTMLDivElement>(null);
  const [quill, setQuill] = useState<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isInternalChange = useRef(false);
  const initialized = useRef(false);

  // 初始化 Quill 实例
  useEffect(() => {
    if (!quillRef.current || initialized.current) return;
    initialized.current = true;

    const quillInstance = new Quill(quillRef.current, {
      theme: "snow",
      placeholder,
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ color: [] }, { background: [] }],
          ["link", "image"],
          [{ align: [] }],
          ["clean"],
        ],
      },
    });

    setQuill(quillInstance);
  }, [placeholder]);

  // quill 实例就绪后设置初始值和监听
  useEffect(() => {
    if (!quill) return;

    if (value) {
      isInternalChange.current = true;
      quill.root.innerHTML = value;
      isInternalChange.current = false;
    }

    quill.on("text-change", () => {
      if (!isInternalChange.current) {
        const html = quill.root.innerHTML;
        onChangeRef.current?.(html === "<p><br></p>" ? "" : html);
      }
    });
  }, [quill]);

  // 外部 value 变化时同步到编辑器
  useEffect(() => {
    if (!quill) return;
    const currentHtml = quill.root.innerHTML;
    const normalizedValue = value || "";
    const normalizedCurrent = currentHtml === "<p><br></p>" ? "" : currentHtml;
    if (normalizedValue !== normalizedCurrent) {
      isInternalChange.current = true;
      quill.root.innerHTML = normalizedValue || "<p><br></p>";
      isInternalChange.current = false;
    }
  }, [quill, value]);

  return (
    <div style={{ minHeight: 500 }}>
      <div ref={quillRef} />
      <style>{`
        .ql-container {
          min-height: 400px;
          font-size: 16px;
        }
        .ql-editor {
          min-height: 400px;
        }
      `}</style>
    </div>
  );
};
