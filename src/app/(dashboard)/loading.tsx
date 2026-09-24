export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="h-12 bg-white rounded-2xl animate-pulse" />

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[160px] bg-white rounded-[32px] animate-pulse p-6 flex flex-col justify-between">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                            <div className="h-8 bg-gray-100 rounded-full w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
