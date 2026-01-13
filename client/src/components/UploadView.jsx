import React, { useState } from 'react';
import { FileUp } from 'lucide-react';

const UploadView = ({ onUpload }) => {
    const [isDragging, setIsDragging] = useState(false);

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
