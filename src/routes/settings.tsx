import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UserAccessRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: Array<"admin" | "staff">;
};

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const businessSettingsSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  website: z.string().optional(),
  currency: z.string().default("NGN"),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  invoice_prefix: z.string().default("BTS-INV"),
  signature_url: z.string().optional(),
});

type BusinessSettingsForm = z.infer<typeof businessSettingsSchema>;

function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const qc = useQueryClient();

  const { data: accessUsers = [], isLoading: accessUsersLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async (): Promise<UserAccessRecord[]> => {
      const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, email, full_name")
            .order("full_name", { ascending: true }),
          supabase.from("user_roles").select("user_id, role"),
        ]);

      if (profilesError) throw profilesError;
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, Array<"admin" | "staff">>();
      for (const row of roles ?? []) {
        const current = roleMap.get(row.user_id) ?? [];
        if (row.role === "admin" || row.role === "staff") {
          current.push(row.role as "admin" | "staff");
          roleMap.set(row.user_id, current);
        }
      }

      return (profiles ?? []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        roles: roleMap.get(profile.id) ?? [],
      }));
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "staff" }) => {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Could not update user role");
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["business_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_settings").select("*").limit(1);
      if (error) throw error;
      return data?.[0];
    },
  });

  const form = useForm<BusinessSettingsForm>({
    resolver: zodResolver(businessSettingsSchema) as never,
    defaultValues: {
      business_name: settings?.business_name || "Bargazal and Sons Tech Solution",
      phone: settings?.phone || "",
      whatsapp: settings?.whatsapp || "",
      email: settings?.email || "",
      address: settings?.address || "",
      website: settings?.website || "",
      currency: settings?.currency || "NGN",
      tax_rate: settings?.tax_rate || 0,
      invoice_prefix: settings?.invoice_prefix || "BTS-INV",
      signature_url: settings?.signature_url || "",
    },
  });

  async function onSubmit(data: BusinessSettingsForm) {
    setIsLoading(true);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from("business_settings")
          .update(data as never)
          .eq("id", settings.id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["business_settings"] });
      toast.success("Settings updated successfully");
    } catch (err) {
      toast.error("Failed to update settings");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your business settings and preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="business" className="space-y-4">
          <TabsList>
            <TabsTrigger value="business">Business Information</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="access">Team & Access</TabsTrigger>
          </TabsList>

          <TabsContent value="access">
            <Card>
              <CardHeader>
                <CardTitle>Team & Access</CardTitle>
                <CardDescription>
                  Manage user roles and access permissions for the admin workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accessUsersLoading ? (
                    <div className="text-sm text-muted-foreground">Loading users...</div>
                  ) : accessUsers.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                      No users found yet.
                    </div>
                  ) : (
                    accessUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="font-medium">{user.full_name || "Unnamed user"}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email || "No email"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge
                                  key={`${user.id}-${role}`}
                                  variant={role === "admin" ? "default" : "secondary"}
                                >
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline">No role</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex w-full max-w-sm items-center gap-2">
                          <Select
                            defaultValue={user.roles.includes("admin") ? "admin" : "staff"}
                            onValueChange={(value) => {
                              updateUserRole.mutate({
                                userId: user.id,
                                role: value as "admin" | "staff",
                              });
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Information Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Update your business details</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="business_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@business.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+234..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp</FormLabel>
                            <FormControl>
                              <Input placeholder="+234..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Full business address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signature_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Signature Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://.../signature.png" {...field} />
                          </FormControl>
                          <FormDescription>
                            Add this once and it will appear on every receipt. Use a transparent PNG
                            or JPG URL.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoicing Tab */}
          <TabsContent value="invoicing">
            <Card>
              <CardHeader>
                <CardTitle>Invoicing Settings</CardTitle>
                <CardDescription>Configure invoice defaults and tax settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="invoice_prefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Prefix</FormLabel>
                            <FormControl>
                              <Input placeholder="BTS-INV" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <FormControl>
                              <Input placeholder="NGN" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="tax_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
