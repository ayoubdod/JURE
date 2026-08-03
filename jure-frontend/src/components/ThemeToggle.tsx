// src/components/ThemeToggle.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

/** Tailwind dark mode must be `class` in tailwind.config.js */
const ThemeToggle: React.FC<{ label?: string; title?: string }> = ({ label, title }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", shouldDark);
    setIsDark(shouldDark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <Button
      onClick={toggle}
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0 border-[#64499D]/20 dark:border-[#8B6FD1]/30 text-slate-700 dark:text-slate-200 hover:bg-[#F4F1FF]/80 dark:hover:bg-[#64499D]/20"
      aria-label={label || "Toggle theme"}
      title={title || "Toggle theme"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

export default ThemeToggle;
