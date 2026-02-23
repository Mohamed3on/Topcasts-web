'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { ArrowDown } from 'lucide-react';
import { useState } from 'react';

export const EpisodeDescription = ({
  description,
}: {
  description: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!description) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className=" space-y-2">
      <div className="flex justify-center md:justify-start">
        <CollapsibleTrigger className="flex items-baseline">
          <h4 className="font-semibold">Episode description</h4>
          <div
            className={`ml-2 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <ArrowDown className="flex h-5 w-5" />
          </div>
          <span className="sr-only">Toggle description</span>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="space-y-2">
        <span
          className="break-words"
          dangerouslySetInnerHTML={{
            __html: description,
          }}
        ></span>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default EpisodeDescription;
