import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger> Theme</DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <MoonStar className="mr-2 h-4 w-4"/>
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <SunMedium className="mr-2 h-4 w-4"/>
            Light
          </DropdownMenuItem>
        </DropdownMenuSubContent>

      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

