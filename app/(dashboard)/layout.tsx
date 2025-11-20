import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-6 pt-16 lg:pt-6 w-full">{children}</main>
    </div>
  );
}

