import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';
import { Pagination } from './Pagination';

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  pageSize?: number;
  className?: string;
}

export function Table<T>({ data, columns, pageSize = 10, className = '' }: TableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      <div className="overflow-x-auto rounded-[8px] border border-border bg-app-surface">
        <table className="w-full text-[12px] text-text-secondary">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
                {headerGroup.headers.map((header) => {
                  const sort = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="text-left font-medium px-3 py-2 text-text-muted"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sort === 'asc' ? (
                            <Icon icon={ChevronUp} size={12} />
                          ) : sort === 'desc' ? (
                            <Icon icon={ChevronDown} size={12} />
                          ) : null}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-b-0 hover:bg-app-hover transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-text-dim">
                  No rows.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-dim">
            Page {pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Pagination
            page={pagination.pageIndex + 1}
            pageCount={table.getPageCount()}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, pageIndex: p - 1 }))}
          />
        </div>
      ) : null}
    </div>
  );
}
