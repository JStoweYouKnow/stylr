import Sidebar from "@/components/layout/Sidebar";
import ToasterWithClose from "@/components/ToasterWithClose";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full lg:flex">
        <ToasterWithClose />
        <Sidebar />
        <main className="min-h-screen w-full lg:flex-1 p-4 lg:p-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </ErrorBoundary>
  );
}

