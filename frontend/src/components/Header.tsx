// frontend/src/components/Header.tsx
import { useClerk, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const { openSignIn, signOut } = useClerk();
  const { user, isSignedIn } = useUser();
  const location = useLocation();

  const isChatRoom = location.pathname.startsWith('/chat/');
  useEffect(() => {
    if (isChatRoom) {
      document.body.classList.add('hide-bottom-nav');
    } else {
      document.body.classList.remove('hide-bottom-nav');
    }
  }, [isChatRoom]);

  return (
    <>
      <header style={{
        position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: 'calc(60px + var(--safe-top))',
      paddingTop: 'var(--safe-top)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--safe-top) 24px 0',
      background: 'rgba(8, 13, 26, 0.85)',
      borderBottom: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: '8px',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px var(--color-primary-glow)',
          fontSize: 16, fontWeight: 800,
          color: 'white',
          fontFamily: 'var(--font-headline)',
        }}>W</div>
        <span style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 800,
          fontSize: 20,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
        }}>
          Wango
        </span>
      </Link>

      {/* Nav Links */}
      <nav className="desktop-nav" style={{ alignItems: 'center', gap: '4px' }}>
        {[
          { label: 'Discover', path: '/' },
          { label: 'Post Hangout', path: '/post' },
          { label: 'Dashboard', path: '/dashboard' },
        ].map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              color: location.pathname === path ? 'var(--color-primary)' : 'var(--text-secondary)',
              background: location.pathname === path ? 'var(--color-primary-dim)' : 'transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isSignedIn ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white',
              }}>
                {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? 'W'}
              </div>
              <span className="header-auth-name" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                {user?.firstName ?? 'Explorer'}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12 }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => openSignIn()}>
            Sign In
          </button>
        )}
      </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        {[
          { label: 'Discover', path: '/', icon: '🗺️' },
          { label: '+ Post', path: '/post', icon: '📍' },
          { label: 'Dashboard', path: '/dashboard', icon: '⚙️' },
        ].map(({ label, path, icon }) => (
          <Link
            key={path}
            to={path}
            style={{
              padding: '8px 12px',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'none',
              color: location.pathname === path ? 'var(--color-primary)' : 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
