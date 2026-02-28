export default function Dashboard() {
    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Community Analytics</h1>
                <p className="text-gray-400">Real-time overview of bot performance and costs.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Metric Cards Placeholder */}
                <div className="bg-dark-800 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Total Members</h3>
                    <p className="text-3xl font-bold text-white">---</p>
                </div>
                <div className="bg-dark-800 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Cache Hit Rate</h3>
                    <p className="text-3xl font-bold text-white">--%</p>
                </div>
                <div className="bg-dark-800 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">AI Invocations</h3>
                    <p className="text-3xl font-bold text-white">---</p>
                </div>
                <div className="bg-dark-800 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Est. Total Cost</h3>
                    <p className="text-3xl font-bold text-white">$---</p>
                </div>
            </div>
        </div>
    );
}
