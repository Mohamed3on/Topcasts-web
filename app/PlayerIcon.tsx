export function PlayerIcon({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <a
      className='w-8 h-8 hover:scale-105 active:scale-95 transform transition-transform'
      href={url}
    >
      {children}
    </a>
  );
}
