// src/pages/SettingsPage.tsx
import React from 'react';

export const SettingsPage: React.FC = () => {
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4500/api';

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>الإعدادات</h1>
      </header>
      <div className="card">
        <div className="settings-section">
          <h3>اتصال API</h3>
          <div className="settings-row">
            <label>عنوان API الأساسي</label>
            <input type="text" value={API_BASE} readOnly />
          </div>
          <div className="settings-row">
            <label>المصادقة</label>
            <input type="text" value=" JWT Bearer Token" readOnly />
          </div>
        </div>
      </div>
    </div>
  );
};
