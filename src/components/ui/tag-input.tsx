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
      {value.map((tag) => (
        <Badge key={tag} variant={variant} className="gap-1 pr-1 text-sm">
          {Icon && <Icon className="shrink-0" />}
          {tag}
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
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        className="placeholder:text-muted-foreground min-w-20 flex-1 bg-transparent outline-none"
      />
    </div>
  );
};
