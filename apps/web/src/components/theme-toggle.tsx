import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";


function ToggleComponent({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (

    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
          !isDark ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={!isDark}
      >
        <SunMedium className="h-4 w-4" />
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
          isDark ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={isDark}
      >
        <MoonStar className="h-4 w-4" />
        <span>Dark</span>
      </button>
    </div>
  )
}


function DropdownComponent() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger> Theme</DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <MoonStar className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <SunMedium className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
        </DropdownMenuSubContent>

      </DropdownMenuPortal>
    </DropdownMenuSub>
  )

}

export function ThemeToggle({ className, isToggle }: { className?: string, isToggle?: boolean }) {
  if (isToggle) {
    return <ToggleComponent className={className} />
  }

  return (
    <DropdownComponent />
  );
}
