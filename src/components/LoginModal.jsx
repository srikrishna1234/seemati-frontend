// File: src/components/LoginModal.jsx
import React, { useState } from 'react';
import axios from '../api/axiosInstance';


export default function LoginModal({ open, onClose, onLogin }) {
const [form, setForm] = useState({ email: '', password: '' });
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);


if (!open) return null;


function onChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }


async function submit(e) {
e.preventDefault();
setLoading(true);
setError(null);
try {
const resp = await axios.post('/auth/login', form);
if (onLogin) onLogin(resp.data);
onClose();
} catch (err) {
setError(err?.response?.data?.message || err.message || 'Login failed');
} finally { setLoading(false); }
}


return (
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
<div className="bg-white rounded-lg p-6 w-full max-w-sm">
<h3 className="text-lg font-medium mb-3">Login</h3>
<form onSubmit={submit} className="space-y-3">
<input name="email" value={form.email} onChange={onChange} placeholder="Email" type="email" className="w-full p-2 border rounded" required />
<input name="password" value={form.password} onChange={onChange} placeholder="Password" type="password" className="w-full p-2 border rounded" required />


{error && <div className="text-red-600">{error}</div>}


<div className="flex justify-between items-center">
<div>
<button type="submit" disabled={loading} className="px-4 py-2 rounded border">{loading ? 'Logging...' : 'Login'}</button>
</div>
<div>
<button type="button" onClick={onClose} className="px-3 py-2">Close</button>
</div>
</div>
</form>
</div>
</div>
);
}