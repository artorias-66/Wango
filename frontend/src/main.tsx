// frontend/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const rootEl = document.getElementById('root')!;

if (!PUBLISHABLE_KEY) {
  rootEl.innerHTML = `
    <div style="
      min-height:100vh; display:flex; align-items:center; justify-content:center;
      font-family:Inter,sans-serif; background:#080d1a; color:#ef4444; flex-direction:column; gap:16px; padding:24px; text-align:center;
    ">
      <div style="font-size:48px">⚙️</div>
      <h2 style="font-size:20px; color:#f0f4ff; margin:0">Missing Clerk Key</h2>
      <p style="color:#6b7a99; max-width:400px; margin:0; line-height:1.6">
        Add <code style="color:#00d4ff">VITE_CLERK_PUBLISHABLE_KEY</code> to
        <code style="color:#00d4ff">frontend/.env</code> and restart the dev server.
      </p>
      <p style="color:#6b7a99; font-size:13px; margin:0">
        Get your key from <a href="https://dashboard.clerk.com" style="color:#00d4ff">dashboard.clerk.com</a>
      </p>
    </div>
  `;
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </StrictMode>
  );
}
