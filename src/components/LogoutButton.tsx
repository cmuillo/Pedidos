"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="ml-auto px-3 py-1 rounded-md bg-danger text-white font-medium hover:opacity-90 transition-opacity">
      Salir
    </button>
  );
}
