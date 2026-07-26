import { ThemeProvider as NextThemesProvider  } from "next-themes";

export function ThemeProvider({ children, ...props }: any) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="gymos-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
