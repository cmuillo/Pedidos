"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/historial", label: "Historial" },
  { href: "/admin/empresa", label: "Empresa" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "px-2 py-1 rounded-md bg-accent text-accent-fg font-medium transition-colors"
                : "px-2 py-1 rounded-md hover:text-accent transition-colors"
            }>
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
