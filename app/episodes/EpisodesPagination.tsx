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

export const EpisodePagination = ({
  hasNextPage = true,
}: {
  hasNextPage?: boolean;
}) => {
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');

  const updatePageParam = (url: string, page: number) => {
    const searchParams = new URLSearchParams(url);
    searchParams.set('page', page.toString());
    return searchParams.toString();
  };

  const hasPreviousPage = page > 1;

  return (
    <Pagination>
      <PaginationContent className="flex justify-center">
        <PaginationItem>
          {hasPreviousPage ? (
            <PaginationPrevious
              href={`?${updatePageParam(searchParams.toString(), page - 1)}`}
            />
          ) : null}
        </PaginationItem>
        {[page - 1, page, page + 1]
          .filter(
            (pageNumber) =>
              pageNumber > 0 && (pageNumber !== page + 1 || hasNextPage),
          )
          .map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                isActive={page === pageNumber}
                href={`?${updatePageParam(searchParams.toString(), pageNumber)}`}
              >
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}
        {hasNextPage && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={`?${updatePageParam(searchParams.toString(), page + 1)}`}
              />
            </PaginationItem>
          </>
        )}
      </PaginationContent>
    </Pagination>
  );
};
