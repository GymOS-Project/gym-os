import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  id?: string;
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  allowClear?: boolean;
}

function getSelectedDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      id,
      value,
      onChange,
      placeholder = "Select date",
      disabled = false,
      className,
      buttonClassName,
      allowClear = true,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const selectedDate = getSelectedDate(value);

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start font-normal",
                !selectedDate && "text-muted-foreground",
                buttonClassName,
              )}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{selectedDate ? format(selectedDate, "PPP") : placeholder}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              defaultMonth={selectedDate}
              captionLayout="dropdown"
              startMonth={new Date(1900, 0)}
              endMonth={new Date(new Date().getFullYear() + 10, 11)}
              onSelect={(date) => {
                onChange(date ? format(date, "yyyy-MM-dd") : "");
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        {allowClear && value ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => onChange("")}
            aria-label="Clear date"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

export { DatePicker };
