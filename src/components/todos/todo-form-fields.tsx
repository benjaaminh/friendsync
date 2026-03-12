/**
 * Options for setting a todo
 */
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface TodoDurationOption {
  value: string;
  label: string;
}

// minutes
export const TODO_DURATION_OPTIONS: TodoDurationOption[] = [
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1.5 hours" },
  { value: "120", label: "2 hours" },
  { value: "180", label: "3 hours" },
  { value: "240", label: "4 hours" },
  { value: "600", label: "All day" },
];

interface TodoFormFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  description?: string;
  onDescriptionChange?: (value: string) => void;
  showDescription?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  titleId?: string;
  descriptionId?: string;
  titleLabel?: string;
  titlePlaceholder?: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  onTitleEnter?: () => void;
  durationOptions?: TodoDurationOption[];
}

//default values for the form. reusable component
export function TodoFormFields({
  title,
  onTitleChange,
  duration,
  onDurationChange,
  description,
  onDescriptionChange,
  showDescription = true,
  disabled = false,
  autoFocus,
  titleId = "todo-title",
  descriptionId = "todo-description",
  titleLabel = "What do you want to do?",
  titlePlaceholder = "e.g., Movie night, Bowling...",
  descriptionLabel = "Details (optional)",
  descriptionPlaceholder = "Any notes or details...",
  onTitleEnter,
  durationOptions = TODO_DURATION_OPTIONS,
}: TodoFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={titleId}>{titleLabel}</Label>
        <Input
          id={titleId}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
          required
          maxLength={100}
          autoFocus={autoFocus}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onTitleEnter) {
              e.preventDefault();
              onTitleEnter();
            }
          }}
        />
      </div>

      {showDescription && (
        <div className="space-y-2">
          <Label htmlFor={descriptionId}>{descriptionLabel}</Label>
          <Textarea
            id={descriptionId}
            value={description ?? ""}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            placeholder={descriptionPlaceholder}
            rows={2}
            maxLength={500}
            disabled={disabled}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Estimated Duration</Label>
        <Select value={duration} onValueChange={onDurationChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}