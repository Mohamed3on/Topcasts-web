'use client';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useSearchParams } from 'next/navigation';

export const EpisodePagination = () => {
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');

  const updatePageParam = (url: string, page: number) => {
    const searchParams = new URLSearchParams(url);
    searchParams.set('page', page.toString());
    return searchParams.toString();
  };

  return (
    <Pagination>
      <PaginationContent className="flex justify-center">
        <PaginationItem>
          <PaginationPrevious
            href={
              page === 1
                ? '#'
                : `?${updatePageParam(searchParams.toString(), page - 1)}`
            }
          />
        </PaginationItem>
        {[page, page + 1, page + 2].map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              isActive={page === pageNumber}
              href={`?${updatePageParam(searchParams.toString(), pageNumber)}`}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href={`?${updatePageParam(searchParams.toString(), page + 1)}`}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
