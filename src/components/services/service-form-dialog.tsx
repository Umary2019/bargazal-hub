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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveService, useServiceCategories } from "@/data/services";
import { PRICING_TYPES, SERVICE_STATUSES } from "@/lib/constants";
import type { Service, ServiceCategory } from "@/data/types";

const serviceSchema = z.object({
  name: z.string().min(2, "Service name is required"),
  category_id: z.string().min(1, "Category is required"),
  description: z.string().optional().or(z.literal("")),
  price: z.coerce.number().min(0, "Price must be zero or more"),
  pricing_type: z.enum(["Fixed", "Starting From", "Hourly", "Custom"]),
  duration: z.string().optional().or(z.literal("")),
  status: z.enum(["Active", "Inactive"]),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

const EMPTY_CATEGORIES: ServiceCategory[] = [];

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const { data: categoryData } = useServiceCategories();
  const categories = categoryData ?? EMPTY_CATEGORIES;
  const saveService = useSaveService();
  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as never,
    defaultValues: {
      name: service?.name ?? "",
      category_id: service?.category_id ?? categories[0]?.id ?? "",
      description: service?.description ?? "",
      price: service?.price ?? 0,
      pricing_type: service?.pricing_type ?? "Fixed",
      duration: service?.duration ?? "",
      status: service?.status ?? "Active",
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset({
      name: service?.name ?? "",
      category_id: service?.category_id ?? categories[0]?.id ?? "",
      description: service?.description ?? "",
      price: service?.price ?? 0,
      pricing_type: service?.pricing_type ?? "Fixed",
      duration: service?.duration ?? "",
      status: service?.status ?? "Active",
    });
  }, [service, categories, reset]);

  async function onSubmit(data: ServiceFormData) {
    await saveService.mutateAsync(service ? {
      id: service.id,
      values: {
        ...data,
        category_id: data.category_id,
        description: data.description || null,
        duration: data.duration || null,
      },
    } : {
      values: {
        ...data,
        category_id: data.category_id,
        description: data.description || null,
        duration: data.duration || null,
      },
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            {service ? "Update the selected service." : "Create a new service for your business."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Web Application Development" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
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
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pricing_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRICING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
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
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2 weeks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveService.isPending}>
                {saveService.isPending ? "Saving..." : service ? "Update Service" : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
