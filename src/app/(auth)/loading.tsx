export default function AuthLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-lg border border-gray-100 space-y-6">
                <div className="flex justify-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-100 rounded-full w-3/4 mx-auto animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="h-12 bg-blue-100 rounded-xl animate-pulse" />
                </div>
            </div>
        </div>
    );
}
