import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 p-4 border-b overflow-x-auto text-sm bg-surface items-center">
        <Link href="/admin/pedidos" className="hover:text-accent transition-colors">Pedidos</Link>
        <Link href="/admin/inventario" className="hover:text-accent transition-colors">Inventario</Link>
        <Link href="/admin/empresa" className="hover:text-accent transition-colors">Empresa</Link>
        <Link href="/admin/reportes" className="hover:text-accent transition-colors">Reportes</Link>
        <Link href="/admin/historial" className="hover:text-accent transition-colors">Historial</Link>
        <LogoutButton />
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
