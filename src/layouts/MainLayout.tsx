import { Suspense } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';

import { InstallAutoPrompt } from '@/components/pwa/InstallAutoPrompt';
import { PwaUpdateToast } from '@/components/pwa/PwaUpdateToast';
import { PwaHeadSync } from '@/components/pwa/PwaHeadSync';
import { PushOptInGate } from '@/components/notifications/PushOptInGate';
import { ChatLauncher } from '@/features/chat/components/ChatLauncher';

interface MainLayoutProps {
  children: React.ReactNode;
}

const ContentSpinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
  </div>
);

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <PwaHeadSync />
      <PwaUpdateToast />
      <InstallAutoPrompt />
      <PushOptInGate />
      <ChatLauncher />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-3 sm:p-6 overflow-auto bg-background">
            <div className="max-w-7xl mx-auto">
              
              <Suspense fallback={<ContentSpinner />}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
