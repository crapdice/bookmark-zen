import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileUp, Folder } from 'lucide-react';

const CategoryNode = ({ name, node, metadata }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="category-node">
            <h5
                onClick={() => setIsOpen(!isOpen)}
                className="category-header"
            >
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {name === 'Uncategorized' ? <FileUp size={16} /> : <Folder size={16} />}
                {name}
                <span className="category-count">({node.items.length + Object.keys(node.children).length})</span>
            </h5>

            {isOpen && (
                <>
                    {/* Direct Items */}
                    <ul className="item-list">
                        {node.items.map(bm => (
                            <li key={bm.id} className="item-row">
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}`}
                                    alt=""
                                    style={{ width: 16, height: 16, opacity: 0.7 }}
                                />
                                <a href={bm.url} target="_blank" rel="noopener noreferrer" className="item-link">
                                    {metadata[bm.url]?.title || bm.title}
                                </a>
                            </li>
                        ))}
                    </ul>

                    {/* Subfolders Recursive */}
                    {Object.keys(node.children).length > 0 && (
                        <div className="subfolder-container">
                            {Object.entries(node.children).map(([childName, childNode]) => (
                                <CategoryNode key={childName} name={childName} node={childNode} metadata={metadata} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CategoryNode;
