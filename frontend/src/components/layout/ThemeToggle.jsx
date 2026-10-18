import { IconButton } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ className }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <IconButton
      icon={dark ? "sun" : "moon"}
      label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
      onClick={toggleTheme}
      className={className}
    />
  );
}
