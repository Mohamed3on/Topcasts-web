'use client';

import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Result = {
  id: number;
  episode_name: string;
  podcast_name: string;
  image_url: string | null;
  slug: string;
};

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchResults = useCallback(async (q: string) => {
    abortRef.current?.abort();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(
        `/api/search/autocomplete?q=${encodeURIComponent(q)}`,
        { signal: controller.signal },
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen((data.results ?? []).length > 0);
      setHighlighted(-1);
    } catch {
      // aborted or network error — ignore
    }
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 250);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = (result: Result) => {
    setOpen(false);
    setQuery('');
    router.push(`/episode/${result.id}/${result.slug}`);
  };

  const submitSearch = () => {
    setOpen(false);
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitSearch();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted((h) => (h < results.length - 1 ? h + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((h) => (h > 0 ? h - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlighted >= 0) navigate(results[highlighted]);
        else submitSearch();
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-44 shrink-0 xl:w-96">
      <div className="relative">
        <Input
          type="text"
          className="w-full pr-9"
          placeholder="Search episodes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          onClick={submitSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 transform"
        >
          <SearchIcon className="text-muted-foreground" size={18} />
        </button>
      </div>

      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-72 animate-fade-in-up overflow-hidden rounded-md border bg-popover shadow-lg xl:w-96">
          {results.map((r, i) => (
            <li
              key={r.id}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent ${
                i === highlighted ? 'bg-accent' : ''
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus on input
                navigate(r);
              }}
            >
              {r.image_url ? (
                <Image
                  src={r.image_url}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded"
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{r.episode_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.podcast_name}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
