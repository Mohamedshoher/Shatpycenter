export default function ParentLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-4 space-y-6">
            <div className="h-16 bg-white/80 rounded-3xl animate-pulse" />
            <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-white rounded-2xl animate-pulse p-4 flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-100 rounded-xl shrink-0" />
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-100 rounded-full w-1/2" />
                            <div className="h-3 bg-gray-100 rounded-full w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
