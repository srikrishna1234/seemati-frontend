// src/admin/adminlogin.jsx
import React, { useState } from 'react';

// set API base from env (Vercel uses NEXT_PUBLIC_ or REACT_APP_ envs — adjust if different)
const API_BASE = process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_API_BASE || '';

export default function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('enter'); // 'enter' | 'verify' | 'done'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendOtp = async () => {
    setMessage('');
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setMessage('Enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch((API_BASE || '') + '/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone }) // backend accepts mobile alias
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json && json.message ? json.message : 'Failed to send OTP');
      } else {
        setStage('verify');
        setMessage('OTP sent. Enter the code you received.');
      }
    } catch (err) {
      setMessage('Network error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setMessage('');
    if (!otp) {
      setMessage('Enter the OTP');
      return;
    }
    setLoading(true);
    try {
      // This assumes you already have an endpoint to verify OTP — adjust path if needed
      const res = await fetch((API_BASE || '') + '/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phone, otp })
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json && json.message ? json.message : 'OTP verification failed');
      } else {
        setStage('done');
        setMessage('Logged in');
        // Redirect to admin products
        window.location.href = '/admin/products';
      }
    } catch (err) {
      setMessage('Network error verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login container" style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Admin Login</h1>
      <p>Enter your mobile number to receive an OTP.</p>

      {message && <div style={{ margin: '0.5rem 0', color: '#333' }}>{message}</div>}

      {stage === 'enter' && (
        <>
          <label style={{ display: 'block', marginTop: 12 }}>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone"
            style={{ width: '100%', padding: '8px', marginTop: 6 }}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={sendOtp} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        </>
      )}

      {stage === 'verify' && (
        <>
          <label style={{ display: 'block', marginTop: 12 }}>OTP</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            style={{ width: '100%', padding: '8px', marginTop: 6 }}
          />
          <div style={{ marginTop: 10 }}>
            <button onClick={verifyOtp} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>{' '}
            <button onClick={() => setStage('enter')} disabled={loading}>
              Change number
            </button>
          </div>
        </>
      )}
    </div>
  );
}
