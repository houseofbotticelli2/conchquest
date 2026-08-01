import { useAuth } from '../lib/AuthProvider';

export function NotAdmin({ email }: { email: string }) {
  const { signOut } = useAuth();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Not authorized</h1>
        <div className="desc">
          <span className="mono">{email}</span> is a valid Conchquest account, but doesn't have admin access. Ask an existing admin to grant it if you
          believe this is a mistake.
        </div>
        <button className="btn btn-ghost" onClick={signOut} style={{ width: '100%', justifyContent: 'center' }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
