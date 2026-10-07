// src/components/Layout/Sidebar.tsx
import React from 'react';
import { User } from '../../types';
import logo from '../../assets/logo.jpg';

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  activeNav: string;
  onNavChange: (key: string) => void;
}

const NAV_ITEMS = [
  { label: 'لوحة التحكم', icon: 'fa-gauge-high', key: 'dashboard' },
  { label: 'الطلاب', icon: 'fa-user-graduate', key: 'students' },
  { label: 'الفصول', icon: 'fa-building-columns', key: 'classes' },
  { label: 'المواد', icon: 'fa-book', key: 'subjects' },
  { label: 'المعلمون', icon: 'fa-chalkboard-teacher', key: 'teachers' },
  { label: 'الضوارب', icon: 'fa-calculator', key: 'coefficients', path: '/coefficients' },
  { label: 'الدرجات', icon: 'fa-clipboard-list', key: 'grades' },
  { label: 'كشوف الدرجات', icon: 'fa-file-alt', path: '/bulletin', key: 'bulletin' },
  { label: 'الامتحانات', icon: 'fa-pen-to-square', key: 'exams' },
  { label: 'رسوم التسجيل', icon: 'fa-receipt', key: 'registration-fees', path: '/registration-fees' },
  { label: 'الصندوق', icon: 'fa-wallet', key: 'cash-account', path: '/cash-account' },
  { label: 'رواتب المعلمين', icon: 'fa-money-check-alt', key: 'teacher-payments', path: '/teacher-payments' },
  { label: 'الرسوم الدراسية', icon: 'fa-graduation-cap', key: 'school-fees', path: '/school-fees' },
  { label: 'المصروفات', icon: 'fa-receipt', key: 'expenses', path: '/expenses' },
  { label: 'المحاسبة (OHADA)', icon: 'fa-book-open', key: 'accounting', path: '/accounting' },
  { label: 'ترقية الطلاب', icon: 'fa-arrow-up', key: 'promotion', path: '/promotion' },
  { label: 'إدارة المستخدمين', icon: 'fa-users-cog', key: 'users', path: '/users', adminOnly: true },
  { label: 'الإعدادات', icon: 'fa-gear', key: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  onLogout, 
  activeNav, 
  onNavChange 
}) => {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="شعار المدرسة" className="sidebar-logo" />
        <span>المسير المدرسي</span>
      </div>
      <ul className="nav-list">
        {NAV_ITEMS.filter(item => !(item as any).adminOnly || user?.usertype_id === 1).map((item) => (
          <li key={item.key}>
            <button
              className={`nav-item ${activeNav === item.key ? 'active' : ''}`}
              onClick={() => onNavChange(item.key)}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
          <div className="user-info">
            <span className="user-name">{user?.username || 'User'}</span>
            <span className="user-role">{user?.usertype_id === 1 ? 'مدير' : 'مستخدم'}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <i className="fas fa-sign-out-alt"></i> تسجيل الخروج
        </button>
      </div>
    </nav>
  );
};