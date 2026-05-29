import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 p-4 border-b overflow-x-auto text-sm">
        <Link href="/admin/pedidos">Pedidos</Link>
        <Link href="/admin/inventario">Inventario</Link>
        <Link href="/admin/empresa">Empresa</Link>
        <Link href="/admin/reportes">Reportes</Link>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
