import React from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  caption: string;
  columns: ColumnDef<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  caption,
  columns,
  data,
  emptyMessage = 'No data available.',
  className = '',
}: DataTableProps<T>): React.ReactElement {
  return (
    <div
      className={`w-full overflow-x-auto rounded-xl ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <table className="w-full text-left border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-raised, #F0F1EC)' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
                style={{ color: 'var(--text-secondary)' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 px-4 text-center text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-black/[0.02] transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 ${
                      col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
