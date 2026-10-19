import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function getPageList(
  page: number,
  pageCount: number,
  siblingCount: number,
): (number | 'ellipsis')[] {
  const totalShown = siblingCount * 2 + 5;
  if (pageCount <= totalShown) return range(1, pageCount);

  const left = Math.max(page - siblingCount, 2);
  const right = Math.min(page + siblingCount, pageCount - 1);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < pageCount - 1;

  const items: (number | 'ellipsis')[] = [1];
  if (showLeftEllipsis) items.push('ellipsis');
  items.push(...range(left, right));
  if (showRightEllipsis) items.push('ellipsis');
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className = '',
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = getPageList(page, pageCount, siblingCount);

  function pageButton(p: number) {
    const active = p === page;
    return (
      <button
        key={p}
        type="button"
        onClick={() => onPageChange(p)}
        aria-current={active ? 'page' : undefined}
        aria-label={`Page ${p}`}
        className={`min-w-[28px] h-7 px-2 rounded-[6px] text-[11px] transition-colors cursor-pointer ${
          active
            ? 'bg-accent text-app-base font-semibold'
            : 'bg-app-surface text-text-secondary hover:bg-app-hover'
        }`}
      >
        {p}
      </button>
    );
  }

  return (
    <nav aria-label="Pagination" className={`flex items-center gap-1 ${className}`.trim()}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-app-surface text-text-secondary hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Icon icon={ChevronLeft} size={12} />
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} aria-hidden="true" className="text-[11px] text-text-dim px-1">
            …
          </span>
        ) : (
          pageButton(p)
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-app-surface text-text-secondary hover:bg-app-hover disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <Icon icon={ChevronRight} size={12} />
      </button>
    </nav>
  );
}
