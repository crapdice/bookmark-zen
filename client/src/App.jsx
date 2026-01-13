import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Components
import WeepingWillow from './components/WeepingWillow';
import UploadView from './components/UploadView';
import ProcessingView from './components/ProcessingView';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';

function App() {
  const [view, setView] = useState('upload'); // upload, processing, dashboard
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [bookmarks, setBookmarks] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [categories, setCategories] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [progress, setProgress] = useState(0);

  // Check login status on load
  React.useEffect(() => {
    axios.get('/api/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await axios.post('/api/logout');
    setUser(null);
    setView('upload');
    setBookmarks([]);
  };

  const handleUpload = async (htmlContent) => {
    setView('processing');
    setStatusMsg('Parsing file...');

    try {
      const res = await axios.post('/upload', htmlContent, { headers: { 'Content-Type': 'text/html' } });

      if (res.data.success) {
        setBookmarks(res.data.bookmarks);
        setStatusMsg(`Found ${res.data.count} bookmarks. Visiting sites...`);

        const urls = res.data.bookmarks.map(b => b.url).filter(u => u && u.startsWith('http'));

        // Batch Processing
        const BATCH_SIZE = 1;
        const total = urls.length;
        let processed = 0;
        let allMetadata = {};

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = urls.slice(i, i + BATCH_SIZE);
          setStatusMsg(`Analyzing bookmark ${i + 1} of ${total}...`);
          setCurrentUrl(batch[0]);

          try {
            const analysisRes = await axios.post('/analyze', { urls: batch });
            allMetadata = { ...allMetadata, ...analysisRes.data };
            setMetadata(prev => ({ ...prev, ...analysisRes.data }));
          } catch (e) {
            console.error("Batch failed", e);
          }

          processed += batch.length;
          setProgress((processed / total) * 100);
        }

        setStatusMsg('Organizing content...');
        setCurrentUrl('');

        // Categorize with ALL metadata
        const catRes = await axios.post('/categorize', { bookmarks: res.data.bookmarks, metadata: allMetadata });
        setCategories(catRes.data.categories);

        setView('dashboard');
      }
    } catch (err) {
      console.error(err);
      setStatusMsg('Error processing file. Is the server running?');
      setTimeout(() => setView('upload'), 3000);
    }
  };

  return (
    <div className="container">
      <WeepingWillow />

      {/* Auth Controls */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        {user ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ opacity: 0.8 }}>Hi, {user.username}</span>
            <button onClick={handleLogout} className="glass-panel" style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}>
              Logout
            </button>
          </div>
        ) : (
          <button onClick={() => setShowAuthModal(true)} className="glass-panel" style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Sign In / Register
          </button>
        )}
      </div>

      <header className="header-container">
        <h1 className="header-title">
          Bookmark Zen
        </h1>
        <p className="header-subtitle glass-panel">Organize your digital chaos.</p>
      </header>

      <main>
        {view === 'upload' && <UploadView onUpload={handleUpload} />}
        {view === 'processing' && <ProcessingView status={statusMsg} url={currentUrl} progress={progress} />}
        {view === 'dashboard' && <Dashboard bookmarks={bookmarks} metadata={metadata} categories={categories} />}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={(u) => { setUser(u); setShowAuthModal(false); }}
      />
    </div >
  );
}

export default App;
