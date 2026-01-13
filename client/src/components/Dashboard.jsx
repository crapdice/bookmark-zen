import React from 'react';
import { FileUp, Sparkles } from 'lucide-react';
import CategoryNode from './CategoryNode';

const Dashboard = ({ bookmarks, metadata, categories }) => {
    return (
        <div className="dashboard" style={{ position: 'relative' }}>
            <header className="dashboard-header">
                <div className="stats-container">
                    <span>{bookmarks.length} Bookmarks</span>
                    <span>{Object.keys(metadata).length} Analyzed</span>
                </div>
            </header >

            <div className="dashboard-grid">
                {/* Left: Original Stream */}
                <div className="glass-panel scroll-y">
                    <h4 className="panel-header">
                        <FileUp size={16} /> Original Stream
                    </h4>
                    <ul className="item-list">
                        {bookmarks.map(bm => (
                            <li key={bm.id} className="raw-item">
                                <div style={{ fontWeight: 500 }}>{bm.title}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.url}</div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right: Smart Suggestions */}
                <div className="glass-panel scroll-y">
                    <h4 className="panel-header">
                        <Sparkles size={16} color="var(--accent-color)" /> Suggested Organization
                    </h4>

                    {categories ? (
                        <div className="categories-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(categories).map(([category, node]) => (
                                <CategoryNode key={category} name={category} node={node} metadata={metadata} />
                            ))}
                        </div>
                    ) : (
                        <div className="no-suggestions">Processing suggestions...</div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Dashboard;
