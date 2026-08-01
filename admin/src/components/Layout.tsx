import React from 'react';
import type { AdminMe } from '../lib/api';

export type Section = 'dashboard' | 'members' | 'species' | 'prompt' | 'config' | 'health' | 'audit' | 'leaderboard';

const NAV_ITEMS: { section: Section; label: string; icon: React.ReactNode }[] = [
  {
    section: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    ),
  },
  {
    section: 'members',
    label: 'Members',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.7 20c.8-3.6 3.3-5.6 6.3-5.6s5.5 2 6.3 5.6" />
        <circle cx="17.5" cy="7.5" r="2.6" />
        <path d="M15.5 14.3c2.7.2 4.6 2 5.2 4.7" />
      </svg>
    ),
  },
  {
    section: 'species',
    label: 'Species Library',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M12 3a8 8 0 1 1-6 13.3" />
        <path d="M12 6.5a4.5 4.5 0 1 1-3.3 7.6" />
        <path d="M12 10a1.3 1.3 0 1 1-1 2.1" />
      </svg>
    ),
  },
  {
    section: 'prompt',
    label: 'Prompt Testing',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 4h16v11H9l-4 4V4Z" />
        <path d="M8 9h8M8 12.5h5" />
      </svg>
    ),
  },
  {
    section: 'config',
    label: 'System Config',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 6h9M17 6h3M4 12h3M9 12h11M4 18h13M20 18h0" />
        <circle cx="13" cy="6" r="2.1" />
        <circle cx="7" cy="12" r="2.1" />
        <circle cx="17" cy="18" r="2.1" />
      </svg>
    ),
  },
  {
    section: 'health',
    label: 'Service Health',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 12h4l2-7 4 14 2-7h6" />
      </svg>
    ),
  },
  {
    section: 'audit',
    label: 'Audit Log',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3.2 2" />
      </svg>
    ),
  },
  {
    section: 'leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg className="navicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
        <path d="M8 6H5a2 2 0 0 0 0 4h1.2M16 6h3a2 2 0 0 1 0 4h-1.2" />
        <path d="M12 14v3M9 20h6" />
      </svg>
    ),
  },
];

function initialsFrom(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Layout({
  active,
  onNavigate,
  me,
  onSignOut,
  children,
}: {
  active: Section;
  onNavigate: (section: Section) => void;
  me: AdminMe;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Admin sections">
        <div className="brand">
          <span className="brand-mark">Conchquest</span>
          <span className="brand-sub">Admin</span>
        </div>
        <ul className="nav" role="tablist">
          {NAV_ITEMS.map((item) => (
            <li key={item.section}>
              <button
                className={active === item.section ? 'active' : ''}
                role="tab"
                aria-selected={active === item.section}
                onClick={() => onNavigate(item.section)}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-foot">
          <div className="avatar-dot">{initialsFrom(me.displayName || me.email)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="who-name">{me.displayName || me.email}</div>
            <div className="who-role">{me.role}</div>
            <button className="signout-btn" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
