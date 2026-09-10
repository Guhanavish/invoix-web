import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://invoixweb.vercel.app';

// One title + description + canonical per route (SPA, so applied client-side).
const META = {
  '/': {
    title: 'Invoix — GST Billing for Windows with Live Web Mirror',
    desc: 'Invoix is an offline-first GST billing app for Windows. Compose tax invoices, GSTR reports and ledger offline, then read everything live on the web.',
  },
  '/login': {
    title: 'Sign in — Invoix',
    desc: 'Sign in to your Invoix workspace with your user id or Google account to view invoices, ledger and GST reports.',
  },
  '/register': {
    title: 'Create account — Invoix',
    desc: 'Create your free Invoix folio. Pick a user id, verify your email, and sync the desktop app to the web.',
  },
  '/forgot': {
    title: 'Reset password — Invoix',
    desc: 'Recover access to your Invoix workspace with a one-time code sent to your verified email.',
  },
  '/terms': {
    title: 'Terms and Conditions — Invoix',
    desc: 'The terms governing use of the Invoix desktop app and web portal.',
  },
  '/privacy': {
    title: 'Privacy Policy — Invoix',
    desc: 'How Invoix stores your billing data, what never leaves your computer, and your rights.',
  },
  '/404': {
    title: 'Page not found — Invoix',
    desc: 'The page you asked for does not exist. Return to the Invoix home page or open your workspace.',
  },
  '/app': {
    title: 'Workspace — Invoix',
    desc: 'Your synced Invoix workspace: dashboard, invoices, customers, products, ledger and GST reports.',
  },
};

function setTag(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [k, v] = selector.replace(/[\[\]]/g, '').split('=');
    el.setAttribute(k, v.replace(/"/g, ''));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const key = META[pathname] ? pathname : pathname.startsWith('/app') ? '/app' : '/404';
    const m = META[key];
    document.title = m.title;
    setTag('meta[name="description"]', 'content', m.desc);
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', SITE + (key === '/404' ? '/' : key === '/' ? '/' : key));
  }, [pathname]);
}
