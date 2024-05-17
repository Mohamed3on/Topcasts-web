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
  return (
    <Pagination>
      <PaginationContent className="flex justify-center">
        <PaginationItem>
          <PaginationPrevious href={page === 1 ? '#' : `?page=${page - 1}`} />
        </PaginationItem>
        {[page, page + 1, page + 2].map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              isActive={page === pageNumber}
              href={`?page=${pageNumber}`}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href={`?page=${page + 1}`} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
