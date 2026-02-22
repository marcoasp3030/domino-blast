import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
