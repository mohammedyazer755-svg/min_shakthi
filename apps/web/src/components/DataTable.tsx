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
        background: 'var(--dark-surface, #0d0d10)',
        border: '1px solid var(--dark-border, rgba(255,255,255,0.08))',
      }}
    >
      <table className="w-full text-left border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--dark-border-strong, rgba(255,255,255,0.22))' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
                style={{ color: 'var(--dark-text-muted, #8a8a96)' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 px-4 text-center text-sm"
                style={{ color: 'var(--dark-text-muted, #8a8a96)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: '1px solid var(--dark-border, rgba(255,255,255,0.08))' }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 ${
                      col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                    style={{ color: 'var(--dark-text-primary, #f0f0f5)' }}
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
