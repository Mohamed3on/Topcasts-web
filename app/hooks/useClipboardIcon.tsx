import { CheckIcon, ClipboardPaste } from 'lucide-react';
import { useState } from 'react';

const GreenCheckIcon = () => <CheckIcon className="text-green-500" />;
const ClipboardPasteIcon = () => (
  <ClipboardPaste className="text-muted-foreground" />
);

export const useClipboardIcon = () => {
  const [IconComponent, setIconComponent] = useState(() => ClipboardPasteIcon);

  const toggleIcon = () => {
    setIconComponent(() => GreenCheckIcon);
    setTimeout(() => setIconComponent(() => ClipboardPasteIcon), 2000);
  };

  return { IconComponent, toggleIcon };
};
