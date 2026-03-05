import Link from 'next/link';

export const Sidebar = () => {
    return (
        <aside className="w-64 border-r border-gray-200 h-screen p-4 bg-gray-50 flex flex-col">
            <div className="text-2xl font-bold mb-8 text-blue-600">
                <Link href="/">AI Radar</Link>
            </div>
            <nav className="flex flex-col gap-2">
                <Link href="/" className="px-4 py-2 rounded hover:bg-gray-200 hover:text-blue-600 transition-colors font-medium">홈</Link>
                <Link href="/dashboard" className="px-4 py-2 rounded hover:bg-gray-200 hover:text-blue-600 transition-colors font-medium">대시보드</Link>
                <Link href="/jobs" className="px-4 py-2 rounded hover:bg-gray-200 hover:text-blue-600 transition-colors font-medium">직업별 분류</Link>
                <Link href="/news" className="px-4 py-2 rounded hover:bg-gray-200 hover:text-blue-600 transition-colors font-medium">뉴스</Link>
            </nav>
        </aside>
    );
}; // end of Sidebar.tsx
