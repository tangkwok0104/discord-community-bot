import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import FAQ from './pages/FAQ';
import Analytics from './pages/Analytics';
import Rules from './pages/Rules';
import ModerationLogs from './pages/ModerationLogs';
import Knowledge from './pages/Knowledge';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="rules" element={<Rules />} />
          <Route path="moderation" element={<ModerationLogs />} />
          <Route path="knowledge" element={<Knowledge />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
