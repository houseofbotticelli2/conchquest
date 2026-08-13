import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import { Login } from './screens/Login';
import { NotAdmin } from './screens/NotAdmin';
import { Dashboard } from './screens/Dashboard';
import { Members } from './screens/Members';
import { ContentModeration } from './screens/ContentModeration';
import { SpeciesLibrary } from './screens/SpeciesLibrary';
import { PromptTesting } from './screens/PromptTesting';
import { SystemConfig } from './screens/SystemConfig';
import { ServiceHealth } from './screens/ServiceHealth';
import { AuditLog } from './screens/AuditLog';
import { Leaderboard } from './screens/Leaderboard';
import { Layout, type Section } from './components/Layout';

function AppShell() {
  const { state, signOut } = useAuth();
  const [section, setSection] = useState<Section>('dashboard');

  if (state.status === 'loading') {
    return (
      <div className="login-wrap">
        <div className="desc">Loading...</div>
      </div>
    );
  }

  if (state.status === 'signedOut') return <Login />;
  if (state.status === 'notAdmin') return <NotAdmin email={state.email} />;

  return (
    <Layout active={section} onNavigate={setSection} me={state.me} onSignOut={signOut}>
      {section === 'dashboard' && <Dashboard />}
      {section === 'members' && <Members />}
      {section === 'moderation' && <ContentModeration />}
      {section === 'species' && <SpeciesLibrary />}
      {section === 'prompt' && <PromptTesting />}
      {section === 'config' && <SystemConfig onGoToPrompt={() => setSection('prompt')} />}
      {section === 'health' && <ServiceHealth />}
      {section === 'audit' && <AuditLog />}
      {section === 'leaderboard' && <Leaderboard />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
