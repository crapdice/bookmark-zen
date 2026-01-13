import React, { useState } from 'react';
import axios from 'axios';

const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState(''); // Optional mostly
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isRegister ? '/api/register' : '/api/login';
        const payload = isRegister ? { email, password, username } : { email, password };

        try {
            const res = await axios.post(endpoint, payload);
            if (res.data.user) {
                onLoginSuccess(res.data.user);
                onClose();
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={overlayStyle}>
            <div className="glass-panel modal-content" style={modalStyle}>
                <button style={closeBtnStyle} onClick={onClose}>&times;</button>

                <h2 style={{ marginTop: 0, color: 'var(--accent-color)' }}>
                    {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {isRegister && (
                        <input
                            type="text"
                            placeholder="Username (optional)"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={inputStyle}
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={inputStyle}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={inputStyle}
                    />

                    {error && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem' }}>{error}</div>}

                    <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                        {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>

                <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '1rem' }}>
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}
                    {' '}
                    <span
                        style={{ color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => { setIsRegister(!isRegister); setError(''); }}
                    >
                        {isRegister ? 'Sign In' : 'Create one'}
                    </span>
                </p>
            </div>
        </div>
    );
};

// Inline Styles for simplicity
const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
};

const modalStyle = {
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    textAlign: 'center'
};

const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '12px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    outline: 'none'
};

const closeBtnStyle = {
    position: 'absolute',
    top: '10px',
    right: '15px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '1.5rem',
    cursor: 'pointer'
};

export default AuthModal;
