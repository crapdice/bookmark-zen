import React, { useState } from 'react';
import { FileUp } from 'lucide-react';

const UploadView = ({ onUpload, detectedBrowser }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => onUpload(e.target.result);
        reader.readAsText(file);
    };

    const getInstructions = () => {
        switch (detectedBrowser) {
            case 'Chrome':
                return (
                    <ol className="instructions-list">
                        <li>Click the <strong>three dots</strong> menu (top right).</li>
                        <li>Go to <strong>Bookmarks and lists</strong> &gt; <strong>Bookmark Manager</strong>.</li>
                        <li>Click the three dots (top right of blue bar) &gt; <strong>Export bookmarks</strong>.</li>
                    </ol>
                );
            case 'Firefox':
                return (
                    <ol className="instructions-list">
                        <li>Click the menu button &gt; <strong>Bookmarks</strong>.</li>
                        <li>Select <strong>Manage Bookmarks</strong> (at the bottom).</li>
                        <li>Click <strong>Import and Backup</strong> &gt; <strong>Export Bookmarks to HTML...</strong></li>
                    </ol>
                );
            case 'Edge':
                return (
                    <ol className="instructions-list">
                        <li>Click the <strong>three dots</strong> menu &gt; <strong>Favorites</strong>.</li>
                        <li>Click the <strong>three dots</strong> in the Favorites popup.</li>
                        <li>Select <strong>Export favorites</strong>.</li>
                    </ol>
                );
            case 'Safari':
                return (
                    <ol className="instructions-list">
                        <li>In the menu bar, click <strong>File</strong>.</li>
                        <li>Select <strong>Export Bookmarks...</strong></li>
                    </ol>
                );
            default:
                return (
                    <p>Export your bookmarks to an HTML file from your browser settings.</p>
                );
        }
    };

    return (
        <div
            className={`glass-panel upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <div className="upload-icon">
                <FileUp size={64} />
            </div>
            <h2>Import your Bookmarks</h2>

            {detectedBrowser && detectedBrowser !== 'Unknown' && (
                <div className="import-instructions-container">
                    <div className="import-instructions-box">
                        <p className="detected-text">
                            We detected you're using {detectedBrowser}.
                        </p>
                        <button
                            className="btn-secondary"
                            onClick={(e) => { e.stopPropagation(); setShowInstructions(!showInstructions); }}
                        >
                            {showInstructions ? 'Hide Instructions' : `How to export from ${detectedBrowser}?`}
                        </button>

                        {showInstructions && (
                            <div className="instructions-content">
                                {getInstructions()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
                Drag and drop your browser export file (HTML) here,<br />
                or click to select.
            </p>
            <input
                type="file"
                id="fileInput"
                accept=".html"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
            />
            <button className="btn-primary" onClick={() => document.getElementById('fileInput').click()}>
                Select File
            </button>
        </div>
    );
};

export default UploadView;
