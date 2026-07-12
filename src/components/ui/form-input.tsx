import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

type FormInputProps = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
};

export const FormInput = ({
  value,
  onChange,
  placeholder,
  className,
}: FormInputProps) => {
  const [input, setInput] = useState(() => value.join(" "));

  const updateValue = (next: string) => {
    setInput(next);
    onChange(next.trim().split(/\s+/).filter(Boolean));
  };

  const addNA = () => {
    const next = input.trim() ? `${input.trim()} NA` : "NA";
    updateValue(next);
  };

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => updateValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "border-input bg-background h-9 w-full rounded-md border px-3 pr-12 text-sm outline-none",
          className,
        )}
      />

      <Badge
        className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer"
        onClick={addNA}
      >
        NA
      </Badge>
    </div>
  );
};
