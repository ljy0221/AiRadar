export const Header = () => {
    return (
        <header className="h-16 border-b border-gray-200 bg-white flex items-center px-6 justify-between">
            <h2 className="text-xl font-semibold text-gray-800">AI 트렌드 분석 예측 시스템</h2>
            <div className="flex items-center gap-4">
                {/* 사용자 프로필 등 헤더 우측 메뉴 */}
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-white">
                    U
                </div>
            </div>
        </header>
    );
}; // end of Header.tsx
