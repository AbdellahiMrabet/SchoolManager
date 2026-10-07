// src/components/Common/StatsCard.tsx
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-left">
        <h4>{label}</h4>
        <div className="number">{value}</div>
      </div>
      <div className="stat-icon">
        <i className={`fas ${icon}`}></i>
      </div>
    </div>
  );
};