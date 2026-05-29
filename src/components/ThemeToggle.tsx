"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
      className="fixed top-3 right-3 z-50 h-10 w-10 flex items-center justify-center rounded-full border bg-surface text-foreground shadow-sm hover:bg-surface-2 transition-colors"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
