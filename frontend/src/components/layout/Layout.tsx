import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, User, Settings, LogOut, Menu, X, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { path: '/lobby', label: 'Lobby', icon: Home },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="sticky top-0 z-40 bg-mystery-900/80 backdrop-blur-lg border-b border-mystery-700/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/lobby" className="flex items-center gap-2" aria-label="Mystery Mansion Home">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center">
                  <span className="font-cinzel font-bold text-mystery-900">M</span>
                </div>
                <span className="font-cinzel text-xl font-bold text-gradient hidden sm:block">Mystery Mansion</span>
              </Link>

              <div className="hidden md:flex items-center gap-1 bg-mystery-800/50 rounded-lg p-1 border border-mystery-700/50">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/lobby' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-gold-500/20 to-gold-400/10 text-gold-300 border border-gold-500/30'
                          : 'text-mystery-300 hover:text-mystery-50 hover:bg-mystery-700/50'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}
                title={isConnected ? 'Connected to game server' : 'Disconnected from game server'}
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                {isConnected ? 'Online' : 'Offline'}
              </div>

              <div className="relative">
                <button
                  className="relative p-2 rounded-lg text-mystery-300 hover:text-mystery-50 hover:bg-mystery-800/50 transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                >
                  <Bell className="w-5 h-5" />
                </button>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-80 bg-mystery-800 border border-mystery-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-mystery-700 flex items-center justify-between">
                      <h3 className="font-medium text-mystery-50">Notifications</h3>
                      <button className="text-mystery-400 hover:text-mystery-200" onClick={() => setShowNotifications(false)}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="p-4 text-center text-mystery-400">No notifications yet</div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="relative">
                <button
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-mystery-800/50 transition-colors"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <span className="text-mystery-900 font-bold text-sm">
                        {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-mystery-50">{user?.displayName || user?.username}</span>
                  <ChevronDown className="w-4 h-4 text-mystery-400" />
                </button>

                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-48 bg-mystery-800 border border-mystery-700 rounded-lg shadow-xl overflow-hidden"
                  >
                    <div className="p-3 border-b border-mystery-700">
                      <p className="text-sm font-medium text-mystery-50">{user?.displayName || user?.username}</p>
                      <p className="text-xs text-mystery-400 truncate">{user?.email}</p>
                    </div>
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-mystery-300 hover:bg-mystery-700/50 hover:text-mystery-50" onClick={() => setShowUserMenu(false)}>
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-mystery-300 hover:bg-mystery-700/50 hover:text-mystery-50" onClick={() => setShowUserMenu(false)}>
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <hr className="my-2 border-mystery-700" />
                    <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </motion.div>
                )}
              </div>

              <button
                className="md:hidden p-2 rounded-lg text-mystery-300 hover:text-mystery-50 hover:bg-mystery-800/50"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </nav>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-mystery-700/50 bg-mystery-900/95 backdrop-blur"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/lobby' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-gold-500/20 text-gold-300' : 'text-mystery-300 hover:text-mystery-50 hover:bg-mystery-800/50'}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              <hr className="my-2 border-mystery-700" />
              <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg">
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </header>

      <main className="flex-1" id="main-content">
        <Outlet />
      </main>

      <footer className="border-t border-mystery-700/50 bg-mystery-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-mystery-500">
            <p>Built for ft_transcendence &copy; {new Date().getFullYear()}</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-gold-400 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-gold-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
