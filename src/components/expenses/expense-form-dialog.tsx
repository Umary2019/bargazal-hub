import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveExpense } from "@/data/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { Expense } from "@/data/types";

const expenseSchema = z.object({
  category: z.enum([
    "Internet",
    "Hosting",
    "Domain",
    "Transportation",
    "Equipment",
    "Software",
    "Marketing",
    "Office",
    "Utilities",
    "Maintenance",
    "Other",
  ]),
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  expense_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["Cash", "Bank Transfer", "POS", "Online Payment", "Other"]),
  vendor: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
}

const paymentMethods = ["Cash", "Bank Transfer", "POS", "Online Payment", "Other"] as const;

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  const saveExpense = useSaveExpense();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as never,
    defaultValues: {
      category: (expense?.category ?? "Other") as ExpenseFormData["category"],
      description: expense?.description ?? "",
      amount: expense?.amount ?? 0,
      expense_date: expense?.expense_date ?? new Date().toISOString().slice(0, 10),
      payment_method: expense?.payment_method ?? "Cash",
      vendor: expense?.vendor ?? "",
      notes: expense?.notes ?? "",
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset({
      category: (expense?.category ?? "Other") as ExpenseFormData["category"],
      description: expense?.description ?? "",
      amount: expense?.amount ?? 0,
      expense_date: expense?.expense_date ?? new Date().toISOString().slice(0, 10),
      payment_method: expense?.payment_method ?? "Cash",
      vendor: expense?.vendor ?? "",
      notes: expense?.notes ?? "",
    });
  }, [expense, reset]);

  async function onSubmit(data: ExpenseFormData) {
    await saveExpense.mutateAsync(
      expense
        ? {
            id: expense.id,
            values: {
              ...data,
              vendor: data.vendor || null,
              notes: data.notes || null,
              expense_number: expense.expense_number,
            },
          }
        : {
            values: {
              ...data,
              vendor: data.vendor || null,
              notes: data.notes || null,
              expense_number: "",
            },
          },
    );
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Record Expense"}</DialogTitle>
          <DialogDescription>
            {expense ? "Update expense details." : "Capture an outgoing business expense."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Monthly domain hosting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl>
                    <Input placeholder="Name of vendor or store" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveExpense.isPending}>
                {saveExpense.isPending ? "Saving..." : expense ? "Update Expense" : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
