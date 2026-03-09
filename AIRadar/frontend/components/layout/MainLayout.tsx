import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout = ({ children }: { children: ReactNode }) => {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-white text-gray-900">
            <Sidebar />
            <div className="flex flex-col flex-1 h-full w-full">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}; // end of MainLayout.tsx
