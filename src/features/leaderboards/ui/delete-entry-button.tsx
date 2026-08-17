"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "@/shared/ui";
import { deleteEntry } from "../model/actions";

type DeleteEntryButtonProps = {
  entryId: string;
  carLabel: string;
};

export function DeleteEntryButton({
  entryId,
  carLabel,
}: DeleteEntryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteEntry(entryId);
    setIsDeleting(false);

    if (result?.rootError) {
      setError(result.rootError);
      return;
    }

    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex w-72 flex-col gap-4">
          <p className="text-sm font-semibold">Remove this {carLabel} time?</p>
          {error && <p className="text-sm text-accent-600">{error}</p>}
          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
