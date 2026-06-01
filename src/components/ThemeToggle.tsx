"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

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

  // The global (fixed) toggle is hidden inside the admin panel, where an inline
  // toggle lives next to the "Cargar pedido" button instead.
  if (!inline && pathname?.startsWith("/admin")) return null;

  const className = inline
    ? "h-12 w-12 shrink-0 flex items-center justify-center rounded-lg border bg-surface text-foreground shadow-sm hover:bg-surface-2 transition-colors"
    : "fixed top-3 right-3 z-50 h-10 w-10 flex items-center justify-center rounded-full border bg-surface text-foreground shadow-sm hover:bg-surface-2 transition-colors";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Activar tema claro" : "Activar tema oscuro"}
      className={className}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
