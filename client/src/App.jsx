import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Components
import WeepingWillow from './components/WeepingWillow';
import UploadView from './components/UploadView';
import ProcessingView from './components/ProcessingView';
import Dashboard from './components/Dashboard';

function App() {
  const [view, setView] = useState('upload'); // upload, processing, dashboard
  const [bookmarks, setBookmarks] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [categories, setCategories] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState(0);

  const handleUpload = async (htmlContent) => {
    setView('processing');
    setStatusMsg('Parsing file...');

    try {
      const res = await axios.post('http://localhost:3001/upload', htmlContent, { headers: { 'Content-Type': 'text/html' } });

      if (res.data.success) {
        setBookmarks(res.data.bookmarks);
        setStatusMsg(`Found ${res.data.count} bookmarks. Visiting sites...`);

        const urls = res.data.bookmarks.map(b => b.url).filter(u => u && u.startsWith('http'));

        // Batch Processing
        const BATCH_SIZE = 3;
        const total = urls.length;
        let processed = 0;
        let allMetadata = {};

        for (let i = 0; i < total; i += BATCH_SIZE) {
          const batch = urls.slice(i, i + BATCH_SIZE);
          setStatusMsg(`Analyzing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)}...`);

          try {
            const analysisRes = await axios.post('http://localhost:3001/analyze', { urls: batch });
            allMetadata = { ...allMetadata, ...analysisRes.data };
            setMetadata(prev => ({ ...prev, ...analysisRes.data }));
          } catch (e) {
            console.error("Batch failed", e);
          }

          processed += batch.length;
          setProgress((processed / total) * 100);
        }

        setStatusMsg('Organizing content...');

        // Categorize with ALL metadata
        const catRes = await axios.post('http://localhost:3001/categorize', { bookmarks: res.data.bookmarks, metadata: allMetadata });
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
      <header className="header-container">
        <h1 className="header-title">
          Bookmark Zen
        </h1>
        <p className="header-subtitle">Organize your digital chaos.</p>
      </header>

      <main>
        {view === 'upload' && <UploadView onUpload={handleUpload} />}
        {view === 'processing' && <ProcessingView status={statusMsg} progress={progress} />}
        {view === 'dashboard' && <Dashboard bookmarks={bookmarks} metadata={metadata} categories={categories} />}
      </main>
    </div >
  );
}

export default App;
