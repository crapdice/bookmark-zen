import React from 'react';
import { Loader2 } from 'lucide-react';

const ProcessingView = ({ status, progress }) => (
    <div className="glass-panel processing-container">
        <Loader2 size={48} className="spin" style={{ color: 'var(--accent-color)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <h3>Analyzing your library</h3>
        <p style={{ opacity: 0.7 }}>{status}</p>
        {progress > 0 && (
            <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, background: 'var(--accent-color)', height: '100%', transition: 'width 0.3s' }} />
            </div>
        )}
    </div>
);

export default ProcessingView;
