import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, MessageSquare, Bot, TrendingUp, Shield, AlertTriangle, BookOpen } from 'lucide-react';

const NAV_SECTIONS = [
    {
        label: 'Monitor',
        links: [
            { name: 'Dashboard', path: '/', icon: LayoutDashboard },
            { name: 'Analytics', path: '/analytics', icon: TrendingUp },
            { name: 'Mod Logs', path: '/moderation', icon: AlertTriangle },
        ]
    },
    {
        label: 'Manage',
        links: [
            { name: 'Rules', path: '/rules', icon: Shield },
            { name: 'FAQ Manager', path: '/faq', icon: MessageSquare },
            { name: 'Knowledge', path: '/knowledge', icon: BookOpen },
        ]
    },
    {
        label: 'Config',
        links: [
            { name: 'Agent Settings', path: '/settings', icon: Settings },
        ]
    }
];

export default function Layout() {
    return (
        <div className="flex h-screen bg-transparent text-gray-100 font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-dark-900 border-r border-primary-500/30 glow-border flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent"></div>

                {/* Logo */}
                <div className="p-6 flex items-center gap-3 border-b border-primary-500/30">
                    <Bot className="w-8 h-8 text-primary-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                    <div>
                        <h1 className="text-lg font-bold tracking-tight glow-text uppercase leading-none">SYS.CORE</h1>
                        <p className="text-primary-500/40 text-xs uppercase tracking-widest">Bot Control</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-5 relative z-10 overflow-y-auto">
                    {NAV_SECTIONS.map(section => (
                        <div key={section.label}>
                            <p className="text-primary-500/30 text-xs uppercase tracking-widest px-3 pb-2">{section.label}</p>
                            <div className="space-y-1">
                                {section.links.map(link => (
                                    <NavLink
                                        key={link.name}
                                        to={link.path}
                                        end={link.path === '/'}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-2.5 rounded-none border border-transparent uppercase text-sm tracking-wider transition-all duration-200 ${isActive
                                                ? 'bg-primary-500/10 text-primary-400 border-primary-500/50 glow-border'
                                                : 'text-gray-500 hover:bg-primary-500/5 hover:text-primary-500 hover:border-primary-500/20'
                                            }`
                                        }
                                    >
                                        <link.icon className="w-4 h-4 shrink-0" />
                                        <span className="font-bold">{link.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-primary-500/30 text-xs text-center text-primary-500/50 uppercase tracking-widest relative z-10 bg-dark-900">
                    OpenClaw v2.0 · 🦦🐻🦉
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
