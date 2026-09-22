import { useState } from "react";
import { AlertTriangle, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCancelInvoice } from "@/data/invoices";

interface CancelInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function CancelInvoiceDialog({ open, onOpenChange, invoice }: CancelInvoiceDialogProps) {
  const [reason, setReason] = useState("");
  const cancelInvoice = useCancelInvoice();

  async function handleConfirmCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice?.id) return;
    if (!reason.trim()) {
      toast.error("Please provide a reason for cancelling this invoice");
      return;
    }

    try {
      await cancelInvoice.mutateAsync({
        id: invoice.id,
        reason: reason.trim(),
      });
      setReason("");
      onOpenChange(false);
    } catch {
      // Handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleConfirmCancel}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Cancel Invoice #{invoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Cancelling will invalidate this invoice and prevent further client payments. Existing
              settled payments will not be erased.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <label className="text-xs font-medium text-muted-foreground block">
              Reason for Cancellation *
            </label>
            <Textarea
              rows={3}
              placeholder="e.g. Client requested project scope reduction / Duplicate bill issued"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={cancelInvoice.isPending || !reason.trim()}
              className="gap-1.5"
            >
              <Ban className="w-4 h-4" />
              {cancelInvoice.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
