import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, MessageSquare, Bot } from 'lucide-react';

export default function Layout() {
    const navLinks = [
        { name: 'Analytics', path: '/', icon: LayoutDashboard },
        { name: 'Agent Settings', path: '/settings', icon: Settings },
        { name: 'FAQ Manager', path: '/faq', icon: MessageSquare },
    ];

    return (
        <div className="flex h-screen bg-transparent text-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-dark-900 border-r border-primary-500/30 glow-border flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>

                <div className="p-6 flex items-center gap-3 border-b border-primary-500/30">
                    <Bot className="w-8 h-8 text-primary-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    <h1 className="text-xl font-bold tracking-tight glow-text uppercase">SYS.CORE</h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 relative z-10">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.name}
                            to={link.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-none border border-transparent uppercase text-sm tracking-wider transition-all duration-200 ${isActive
                                    ? 'bg-primary-500/10 text-primary-400 border-primary-500/50 glow-border'
                                    : 'text-gray-500 hover:bg-primary-500/5 hover:text-primary-500 hover:border-primary-500/20'
                                }`
                            }
                        >
                            <link.icon className="w-5 h-5" />
                            <span className="font-bold">{link.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-primary-500/30 text-xs text-center text-primary-500/50 uppercase tracking-widest relative z-10 bg-dark-900">
                    DC_BOT v1.0.0
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-transparent relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary-500/50 to-transparent"></div>
                <div className="p-8 max-w-6xl mx-auto relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
