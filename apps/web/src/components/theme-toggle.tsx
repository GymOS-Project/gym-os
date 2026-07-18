import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/85 px-3 py-2 text-sm shadow-card backdrop-blur-xl",
        className,
      )}
    >
      <SunMedium className={cn("h-4 w-4 transition-colors", isDark ? "text-muted-foreground" : "text-primary")} />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <MoonStar className={cn("h-4 w-4 transition-colors", isDark ? "text-primary" : "text-muted-foreground")} />
    </div>
  );
}
