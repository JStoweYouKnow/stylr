import Sidebar from "@/components/layout/Sidebar";
import { Toaster, toast } from "react-hot-toast";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full lg:flex">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#363636',
              padding: '16px',
              paddingRight: '40px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              position: 'relative',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        >
          {(t) => (
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <div style={{ flex: 1 }}>
                {t.message as React.ReactNode}
              </div>
              <button
                onClick={() => toast.dismiss(t.id)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '18px',
                  lineHeight: '1',
                }}
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          )}
        </Toaster>
        <Sidebar />
        <main className="min-h-screen w-full lg:flex-1 p-4 lg:p-6 pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </ErrorBoundary>
  );
}

