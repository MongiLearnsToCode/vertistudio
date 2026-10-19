import { useMemo } from 'react';
import { Table } from '@shared/components';
import type { ColumnDef } from '@tanstack/react-table';
import type { DemoSection } from './types';

interface Row {
  id: number;
  name: string;
  type: string;
  size: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'notes.txt', type: 'text', size: 1240 },
  { id: 2, name: 'photo.png', type: 'image', size: 248_000 },
  { id: 3, name: 'budget.csv', type: 'csv', size: 4800 },
  { id: 4, name: 'archive.zip', type: 'zip', size: 12_400_000 },
  { id: 5, name: 'README.md', type: 'markdown', size: 2300 },
  { id: 6, name: 'app.db', type: 'sqlite', size: 1_200_000 },
  { id: 7, name: 'icon.png', type: 'image', size: 6411 },
  { id: 8, name: 'config.json', type: 'json', size: 540 },
  { id: 9, name: 'log.txt', type: 'text', size: 33_000 },
  { id: 10, name: 'theme.css', type: 'css', size: 4100 },
  { id: 11, name: 'plan.md', type: 'markdown', size: 78_000 },
  { id: 12, name: 'video.mp4', type: 'video', size: 220_000_000 },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function TableDemo() {
  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'type', header: 'Type' },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: (info) => formatBytes(info.getValue() as number),
      },
    ],
    [],
  );
  return <Table data={ROWS} columns={columns} pageSize={5} />;
}

export const advancedSection: DemoSection = {
  title: 'Advanced',
  demos: [
    {
      name: 'Table',
      description:
        'Sortable, paginated table powered by @tanstack/react-table. Headers are click-to-sort, pagination uses the shared Pagination component.',
      render: () => <TableDemo />,
      code: `const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'size', header: 'Size', cell: (i) => formatBytes(i.getValue()) },
];
<Table data={rows} columns={columns} pageSize={10} />`,
    },
  ],
};
