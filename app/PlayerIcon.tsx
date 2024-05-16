export function PlayerIcon({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <a
      className="h-8 w-8 transform transition-transform hover:scale-105 active:scale-95"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
