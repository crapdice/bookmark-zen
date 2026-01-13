import React from 'react';
import { FileUp, Sparkles, Download } from 'lucide-react';
import CategoryNode from './CategoryNode';

const Dashboard = ({ bookmarks, metadata, categories }) => {

    const generateNetscapeHTML = (categories) => {
        let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;
        const traverse = (nodes, indent = 4) => {
            let output = '';
            const spaces = ' '.repeat(indent);

            for (const [name, data] of Object.entries(nodes)) {
                output += `${spaces}<DT><H3>${name}</H3>\n`;
                output += `${spaces}<DL><p>\n`;

                // Items
                if (data.items) {
                    data.items.forEach(bm => {
                        output += `${spaces}    <DT><A HREF="${bm.url}" ADD_DATE="${bm.addDate || ''}">${bm.title}</A>\n`;
                    });
                }

                // Children (Subfolders)
                if (data.children) {
                    output += traverse(data.children, indent + 4);
                }

                output += `${spaces}</DL><p>\n`;
            }
            return output;
        };

        html += traverse(categories);
        html += '</DL><p>';
        return html;
    };

    const handleDownload = () => {
        if (!categories) return;
        const html = generateNetscapeHTML(categories);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookmark-zen-reorganized.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="dashboard" style={{ position: 'relative' }}>
            <header className="dashboard-header">
                <div className="stats-container">
                    <span>{bookmarks.length} Bookmarks</span>
                    <span>{Object.keys(metadata).length} Analyzed</span>
                </div>
                <button className="btn-primary" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Export Reorganized
                </button>
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
