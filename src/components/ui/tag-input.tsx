import { useState, useRef } from "react";
import type { KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IoDocumentText, IoRemove } from "react-icons/io5";
import { MdRemoveCircle } from "react-icons/md";
import { FaTrailer } from "react-icons/fa6";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  type: "trailer" | "shipping-doc";
};

export const TagInput = ({
  value,
  onChange,
  placeholder,
  className,
  type,
}: TagInputProps) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const copyTag = async (tag: string) => {
    await navigator.clipboard.writeText(tag);
    setCopiedTag(tag);

    window.setTimeout(() => {
      setCopiedTag((current) => (current === tag ? null : current));
    }, 1000);
  };
  const moveTag = (from: number, to: number) => {
    if (from === to) return;

    const next = [...value];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);

    onChange(next);
  };

  const variant =
    type === "trailer"
      ? "secondary"
      : type === "shipping-doc"
        ? "outline"
        : "default";

  const Icon =
    type === "trailer"
      ? FaTrailer
      : type === "shipping-doc"
        ? IoDocumentText
        : null;
  return (
    <div
      className={cn(
        "border-input bg-background flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-md border px-3 py-1.5 text-sm",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, index) => (
        <div className="relative">
          {copiedTag === tag && (
            <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 absolute -top-8 left-1/2 z-50 -translate-x-1/2 rounded-md bg-black px-2 py-1 text-xs font-medium whitespace-nowrap text-white shadow-md duration-150">
              Copied!
            </div>
          )}
          <Badge
            key={tag}
            variant={variant}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) {
                moveTag(dragIndex, index);
                setDragIndex(null);
              }
            }}
            className="cursor-grab gap-1 pr-1 text-sm active:cursor-grabbing"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyTag(tag);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copyTag(tag);
              }}
              className="flex cursor-copy items-center gap-1"
              title="Click to copy"
            >
              {Icon && <Icon className="shrink-0" />}
              <span>{tag}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-destructive ml-1"
            >
              <MdRemoveCircle className="h-4 w-4 cursor-pointer" />
            </button>
          </Badge>
        </div>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          handleKeyDown(e);
        }}
        onBlur={() => addTag(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="placeholder:text-muted-foreground min-w-20 flex-1 bg-transparent outline-none"
      />
    </div>
  );
};
