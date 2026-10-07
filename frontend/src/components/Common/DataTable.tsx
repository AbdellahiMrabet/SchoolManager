// src/components/Common/DataTable.tsx
import React from 'react';

export interface Column<T> {
  key: keyof T;  // This must be a key of the data type
  header: string | React.ReactNode;
  render?: (value: any, item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { [key: string]: any }>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={item.id || item.numero || item.identifient || item.num || index}
              onClick={() => onRowClick?.(item)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((col) => (
                <td key={String(col.key)}>
                  {col.render ? col.render(item[col.key], item) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}