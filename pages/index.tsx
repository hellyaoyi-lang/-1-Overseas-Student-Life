import React from 'react';
import dynamic from 'next/dynamic';

// Import the existing App component (Vite-style) dynamically to avoid SSR issues
const App = dynamic(() => import('../App').then(m => m.default), { ssr: false });

export default function Home() {
  return <App />;
}
