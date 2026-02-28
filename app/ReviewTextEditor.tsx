'use client';

import { saveReviewText } from '@/app/episodes/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquarePlus, Pencil } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

export const ReviewTextEditor = ({
  episodeId,
  reviewText,
  avatarUrl,
}: {
  episodeId: number;
  reviewText?: string;
  avatarUrl?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(reviewText ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveReviewText(episodeId, text.trim() || null);
    setIsSaving(false);

    if (result.error) {
      toast('Error saving review, please try again later', {
        className: 'bg-red-500 text-white',
      });
      return;
    }

    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex w-full min-w-[320px] animate-fade-in-up flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Write your review..."
          autoFocus
        />
        <div className="flex gap-2 self-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setText(reviewText ?? '');
              setIsEditing(false);
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (reviewText) {
    return (
      <div className="relative flex w-full animate-fade-in-up flex-col items-center gap-2 rounded-lg border bg-muted/30 p-5">
        <button
          onClick={() => setIsEditing(true)}
          className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <Pencil size={14} />
        </button>
        {avatarUrl && (
          <Image
            width={32}
            height={32}
            className="rounded-full"
            src={avatarUrl}
            alt="User Image"
          />
        )}
        <p className="font-semibold">Your Review</p>
        <p className="italic">{reviewText}</p>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsEditing(true)}>
      <MessageSquarePlus size={16} />
      Add a review
    </Button>
  );
};
