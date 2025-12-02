// File: src/components/HomeButton.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';


export default function HomeButton({ className }) {
const navigate = useNavigate();
return (
<button
title="Home"
onClick={() => navigate('/')}
className={"fixed bottom-4 right-4 z-40 p-3 rounded-full shadow-lg border bg-white " + (className || '')}
>
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M3 9.5L12 3l9 6.5" />
<path d="M9 22V12h6v10" />
</svg>
</button>
);
}




/* Notes:
- These are full replacement files. Save each block to the exact path shown at the top of each file.
- They use your existing axios instance at src/api/axiosInstance.js. Adjust import path if yours differs.
- To wire routes, add entries in your App.js / router:
<Route path="/shop" element={<ShopProducts />} />
<Route path="/become-distributor" element={<BecomeDistributor />} />
- Use <LoginModal open={open} onClose={() => setOpen(false)} onLogin={handleLogin} /> where you need the login modal.
- Place <HomeButton /> at the root of your app (e.g. inside App.jsx) so it appears on all pages.
*/