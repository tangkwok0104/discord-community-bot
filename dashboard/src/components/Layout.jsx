import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, MessageSquare, Bot } from 'lucide-react';

export default function Layout() {
    const navLinks = [
        { name: 'Analytics', path: '/', icon: LayoutDashboard },
        { name: 'Agent Settings', path: '/settings', icon: Settings },
        { name: 'FAQ Manager', path: '/faq', icon: MessageSquare },
    ];

    return (
        <div className="flex h-screen bg-dark-900 text-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-dark-800 border-r border-gray-800 flex flex-col">
                <div className="p-6 flex items-center gap-3 border-b border-gray-800">
                    <Bot className="w-8 h-8 text-primary-500" />
                    <h1 className="text-xl font-bold tracking-tight">Community AI</h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.name}
                            to={link.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-primary-600/10 text-primary-500 shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`
                            }
                        >
                            <link.icon className="w-5 h-5" />
                            <span className="font-medium">{link.name}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800 text-xs text-center text-gray-500">
                    Discord Community Bot v1.0
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-dark-900">
                <div className="p-8 max-w-6xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
