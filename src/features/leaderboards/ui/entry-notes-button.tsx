"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";

export function EntryNotesButton({ notes }: { notes: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setIsOpen(true)}>
        <StickyNote className="h-3.5 w-3.5" />
        Notes
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex w-72 flex-col gap-4">
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
