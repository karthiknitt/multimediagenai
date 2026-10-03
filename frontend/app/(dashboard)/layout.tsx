import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-magenta-500/5 rounded-full blur-3xl" />
      </div>

      <Sidebar />
      <div className="lg:pl-72">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 relative">{children}</main>
      </div>
    </div>
  );
}
