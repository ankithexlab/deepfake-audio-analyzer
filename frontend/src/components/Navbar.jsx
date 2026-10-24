import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  BarChart2, 
  History, 
  Cpu, 
  Info, 
  Mail, 
  LayoutDashboard, 
  LogIn, 
  LogOut, 
  UserPlus, 
  User, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

export default function Navbar({ apiStatus, modelInfo }) {
  const { user, isAuthenticated, isGuest, logout, guestLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const navigate = useNavigate();

  const isConnected = apiStatus?.status === 'ok';

  const handleGuestQuickLogin = async () => {
    setIsGuestLoading(true);
    try {
      await guestLogin();
      navigate('/upload');
    } catch (err) {
      console.error('Guest login failed:', err);
    } finally {
      setIsGuestLoading(false);
      setMobileMenuOpen(false);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="navbar" aria-label="Main Navigation">
      <div className="navbar-inner">
        {/* Brand Identity */}
        <Link to="/" className="brand-link" onClick={closeMobileMenu}>
          <BrandLogo size={40} />
          <div>
            <span className="brand-title">DeepFake Audio Analyzer</span>
            <div className="brand-subtitle">Deepfake Audio Detection & Forensic Spectral Analyzer</div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ShieldCheck size={16} /> Workbench
          </NavLink>
          <NavLink to="/forensics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <BarChart2 size={16} /> Forensics
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <History size={16} /> History
          </NavLink>
          <NavLink to="/models" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Cpu size={16} /> Models
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Info size={16} /> About
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Mail size={16} /> Contact
          </NavLink>
        </div>

        {/* Right Section: Status & Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* API Health Indicator */}
          <div 
            className={`badge ${isConnected ? 'badge-green' : 'badge-red'}`} 
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
            title={isConnected ? 'Backend API operational on port 5000' : 'Backend API connection failed'}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: isConnected ? '0 0 6px #10b981' : 'none'
            }}></span>
            <span className="font-mono">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {modelInfo?.name && (
            <div 
              className="badge badge-purple" 
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title={`Active Model: ${modelInfo.name}`}
            >
              <Cpu size={12} />
              <span>{modelInfo.type?.toUpperCase() || 'AI'}</span>
            </div>
          )}

          {/* User Auth Buttons / Profile */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div 
                className="badge badge-purple" 
                style={{ fontSize: '0.75rem', gap: '0.35rem' }}
                title={`Signed in as ${user.email}`}
              >
                <User size={13} />
                <span>{user.name?.split(' ')[0] || (isGuest ? 'Guest' : 'User')}</span>
                {isGuest && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(Demo)</span>}
              </div>
              <button 
                onClick={logout} 
                className="btn-secondary" 
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                title="Log out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={handleGuestQuickLogin}
                disabled={isGuestLoading}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                title="Instant Evaluator Demo Access without manual signup"
              >
                <Sparkles size={13} color="#38bdf8" />
                <span>Guest Demo</span>
              </button>
              <Link to="/login" className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>
                <LogIn size={13} /> Login
              </Link>
              <Link to="/signup" className="btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}>
                <UserPlus size={13} /> Signup
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button 
            className="mobile-nav-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <NavLink to="/" end className="nav-link" onClick={closeMobileMenu}>
            Home
          </NavLink>
          <NavLink to="/upload" className="nav-link" onClick={closeMobileMenu}>
            <ShieldCheck size={16} /> Detection Workbench
          </NavLink>
          <NavLink to="/forensics" className="nav-link" onClick={closeMobileMenu}>
            <BarChart2 size={16} /> Forensics & Spectrograms
          </NavLink>
          <NavLink to="/dashboard" className="nav-link" onClick={closeMobileMenu}>
            <LayoutDashboard size={16} /> Analytics Dashboard
          </NavLink>
          <NavLink to="/history" className="nav-link" onClick={closeMobileMenu}>
            <History size={16} /> Scan History & Database
          </NavLink>
          <NavLink to="/models" className="nav-link" onClick={closeMobileMenu}>
            <Cpu size={16} /> AI Model Specifications
          </NavLink>
          <NavLink to="/about" className="nav-link" onClick={closeMobileMenu}>
            <Info size={16} /> About & Forensic Mission
          </NavLink>
          <NavLink to="/contact" className="nav-link" onClick={closeMobileMenu}>
            <Mail size={16} /> Contact & Evaluation
          </NavLink>

          {!isAuthenticated && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)' }}>
              <button
                onClick={handleGuestQuickLogin}
                disabled={isGuestLoading}
                className="btn-primary"
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <Sparkles size={15} /> Instant Guest Examiner Demo
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <Link to="/login" className="btn-secondary" onClick={closeMobileMenu} style={{ justifyContent: 'center' }}>
                  <LogIn size={14} /> Login
                </Link>
                <Link to="/signup" className="btn-secondary" onClick={closeMobileMenu} style={{ justifyContent: 'center' }}>
                  <UserPlus size={14} /> Signup
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
