"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/closet", label: "Closet" },
    { href: "/upload", label: "Upload" },
    { href: "/outfits", label: "Outfits" },
    { href: "/outfits/create", label: "Create Outfit" },
    { href: "/recommendations", label: "Recommendations" },
    { href: "/analytics", label: "Analytics" },
    { href: "/wear-tracking", label: "Wear Tracking" },
    { href: "/style-quiz", label: "Style Quiz" },
  ];

  return (
    <div className="w-60 border-r min-h-screen p-6 flex flex-col gap-4 bg-white">
      <Link href="/">
        <h1 className="text-2xl font-bold">Stylr</h1>
      </Link>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-2 rounded-md transition-colors",
              pathname === item.href
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

