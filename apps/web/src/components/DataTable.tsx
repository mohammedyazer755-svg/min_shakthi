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
    <div className={`w-full overflow-x-auto border border-border rounded-card bg-surface ${className}`}>
      <table className="w-full text-left border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-[#FBFBFA]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`py-3 px-4 font-semibold text-text-primary text-xs uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 px-4 text-center text-sm text-text-secondary"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-[#F7F6F2]/60 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 text-text-primary ${
                      col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
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
