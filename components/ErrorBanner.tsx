import React from 'react';

export default function ErrorBanner({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
      <div style={{ background: '#ff5252', color: '#fff', padding: '10px 16px', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.3)', minWidth: 280, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 700 }}>服务器错误</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>关闭</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 13 }}>{message}</div>
      </div>
    </div>
  );
}
