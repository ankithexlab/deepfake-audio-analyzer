import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  LogIn,
  UserPlus,
  User,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopHeader({ onOpenMobile }) {
  const { user, isAuthenticated, isGuest, logout } = useAuth();
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('df_theme_mode') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    localStorage.setItem('df_theme_mode', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'obsidian' : 'dark'));
  };

  return (
    <header className="top-header" role="banner">
      {/* Left side: Mobile menu toggle button + subtle contextual indicator */}
      <div className="top-header-left">
        <button
          type="button"
          className="top-header-mobile-toggle"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="top-header-crumb">
          <span className="top-header-dot" />
          <span className="top-header-tag">Acoustic Signal Intelligence</span>
        </div>
      </div>

      {/* Right side: Theme toggle, Logout & Profile */}
      <div className="top-header-right">
        {/* Theme Toggle */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={themeMode === 'dark' ? 'Switch to Pure Obsidian Dark' : 'Switch to Cyber Navy Dark'}
          aria-label="Toggle theme contrast"
        >
          {themeMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Authenticated State vs Unauthenticated Controls */}
        {isAuthenticated ? (
          <div className="top-header-auth-group">
            <div
              className="badge badge-purple top-header-user-badge"
              title={`Signed in as ${user?.email || 'User'}`}
            >
              <User size={13} />
              <span className="user-name-text">
                {user?.name?.split(' ')[0] || (isGuest ? 'Guest' : 'User')}
              </span>
              {isGuest && <span className="guest-badge-tag">(Demo)</span>}
            </div>

            <button
              type="button"
              onClick={logout}
              className="btn-secondary top-header-btn"
              title="Log out of session"
            >
              <LogOut size={14} />
              <span className="top-header-btn-label">Logout</span>
            </button>
          </div>
        ) : (
          <div className="top-header-auth-group">
            {/* Login Button */}
            <Link
              to="/login"
              className="btn-secondary top-header-btn"
              title="Sign in to your account"
            >
              <LogIn size={14} />
              <span>Login</span>
            </Link>

            {/* Signup Button */}
            <Link
              to="/signup"
              className="btn-primary top-header-btn"
              title="Create new account"
            >
              <UserPlus size={14} />
              <span>Signup</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
