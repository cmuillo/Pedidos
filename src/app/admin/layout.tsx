import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 flex gap-2 p-4 border-b overflow-x-auto text-sm bg-surface items-center">
        <AdminNav />
        <LogoutButton />
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
