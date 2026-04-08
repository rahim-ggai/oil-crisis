'use client';

import { Header } from './Header';
import { LeftNav } from './LeftNav';
import { StatusBar } from './StatusBar';
import { MainPanel } from './MainPanel';

export function AppShell() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftNav />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <MainPanel />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
