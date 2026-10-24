import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShieldCheck,
  BarChart2,
  LayoutDashboard,
  History,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Mail,
  X,
  Activity,
  LogOut
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ mobileOpen, onCloseMobile, apiStatus, modelInfo }) {
  const { logout } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isMoreActive = ['/models', '/about', '/contact'].includes(currentPath);
  const [moreExpanded, setMoreExpanded] = useState(isMoreActive);

  // Auto-expand "More" if navigated to a sub-route
  useEffect(() => {
    if (isMoreActive) {
      setMoreExpanded(true);
    }
  }, [isMoreActive, currentPath]);

  const isConnected = apiStatus?.status === 'ok';

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const isWorkbenchActive = currentPath === '/workbench' || currentPath === '/upload';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={onCloseMobile}
          aria-label="Close navigation overlay"
        />
      )}

      <aside className={`sidebar-panel ${mobileOpen ? 'open' : ''}`} aria-label="Main Navigation">
        {/* Top Branding Section */}
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" onClick={handleLinkClick}>
            <BrandLogo size={36} />
            <div className="sidebar-brand-text">
              <span className="sidebar-title">DeepFake Audio Analyzer</span>
              <span className="sidebar-subtitle">Deepfake Audio Detection & Forensic Spectral Analyzer</span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button 
            type="button"
            className="sidebar-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation List - Exact Required Order */}
        <nav className="sidebar-nav">
          {/* 1. Home */}
          <NavLink
            to="/"
            end
            onClick={handleLinkClick}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <Home size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Home</span>
          </NavLink>

          {/* 2. Workbench */}
          <Link
            to="/workbench"
            onClick={handleLinkClick}
            className={`sidebar-nav-item ${isWorkbenchActive ? 'active' : ''}`}
          >
            <ShieldCheck size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Workbench</span>
          </Link>

          {/* 3. Forensics */}
          <NavLink
            to="/forensics"
            onClick={handleLinkClick}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart2 size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Forensics</span>
          </NavLink>

          {/* 4. Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={handleLinkClick}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">Dashboard</span>
          </NavLink>

          {/* 5. History */}
          <NavLink
            to="/history"
            onClick={handleLinkClick}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <History size={18} className="sidebar-nav-icon" />
            <span className="sidebar-nav-label">History</span>
          </NavLink>

          {/* 6. More (Expandable Menu with secondary items: Models, About, Contact) */}
          <div className="sidebar-more-group">
            <button
              type="button"
              className={`sidebar-nav-item sidebar-more-btn ${isMoreActive ? 'active-parent' : ''}`}
              onClick={() => setMoreExpanded(!moreExpanded)}
              aria-expanded={moreExpanded}
              aria-haspopup="true"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MoreHorizontal size={18} className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">More</span>
              </div>
              {moreExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {moreExpanded && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/models"
                  onClick={handleLinkClick}
                  className={({ isActive }) => `sidebar-submenu-item ${isActive ? 'active' : ''}`}
                >
                  <Cpu size={15} />
                  <span>Models</span>
                </NavLink>

                <NavLink
                  to="/about"
                  onClick={handleLinkClick}
                  className={({ isActive }) => `sidebar-submenu-item ${isActive ? 'active' : ''}`}
                >
                  <Info size={15} />
                  <span>About</span>
                </NavLink>

                <NavLink
                  to="/contact"
                  onClick={handleLinkClick}
                  className={({ isActive }) => `sidebar-submenu-item ${isActive ? 'active' : ''}`}
                >
                  <Mail size={15} />
                  <span>Contact</span>
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer / System Status & Logout */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            title="Log out of session"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>

          <div className="sidebar-status-card">
            <div className="sidebar-status-header">
              <span className="sidebar-status-label">API Health</span>
              <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
            </div>
            <div className="sidebar-status-row">
              <span className="font-mono" style={{ fontSize: '0.74rem', color: isConnected ? '#34d399' : '#f87171' }}>
                {isConnected ? 'ONLINE (Port 5000)' : 'OFFLINE'}
              </span>
            </div>
            {modelInfo?.name && (
              <div className="sidebar-model-badge" title={`Active engine: ${modelInfo.name}`}>
                <Activity size={12} color="#c4b5fd" />
                <span className="sidebar-model-text">{modelInfo.name}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
