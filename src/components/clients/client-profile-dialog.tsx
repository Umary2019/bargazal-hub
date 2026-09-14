import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Lock, Bell, Check, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface ClientProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any;
}

export function ClientProfileDialog({ open, onOpenChange, client }: ClientProfileDialogProps) {
  const queryClient = useQueryClient();

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [institution, setInstitution] = useState("");
  const [address, setAddress] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Preference fields
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [invoiceReminders, setInvoiceReminders] = useState(true);

  useEffect(() => {
    if (client && open) {
      setFullName(client.full_name || "");
      setPhone(client.phone || "");
      setWhatsapp(client.whatsapp || "");
      setInstitution(client.institution || "");
      setAddress(client.address || "");

      // Load preferences from local storage if present
      const prefStr = localStorage.getItem(`client_prefs_${client.id}`);
      if (prefStr) {
        try {
          const parsed = JSON.parse(prefStr);
          setEmailNotifications(parsed.emailNotifications ?? true);
          setInvoiceReminders(parsed.invoiceReminders ?? true);
        } catch {
          // ignore
        }
      }
    }
  }, [client, open]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!client?.id) return;
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          institution: institution.trim() || null,
          address: address.trim() || null,
        } as any)
        .eq("id", client.id);

      if (error) throw error;
      toast.success("Profile details updated successfully");
      queryClient.invalidateQueries({ queryKey: ["client-portal"] });
      queryClient.invalidateQueries({ queryKey: ["my-client"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  function handleSavePreferences() {
    if (!client?.id) return;
    localStorage.setItem(
      `client_prefs_${client.id}`,
      JSON.stringify({ emailNotifications, invoiceReminders })
    );
    toast.success("Notification preferences saved");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Account & Profile Settings</DialogTitle>
          <DialogDescription>
            Manage your personal contact info, account security, and notification preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-1.5 text-xs">
              <User className="w-3.5 h-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs">
              <Lock className="w-3.5 h-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs">
              <Bell className="w-3.5 h-3.5" /> Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="pt-3">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Full Name *
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    WhatsApp Number
                  </label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="08012345678"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Organization / University / Company
                </label>
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Obafemi Awolowo University"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Address
                </label>
                <Textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your physical or delivery address"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={isSavingProfile} className="gap-1.5">
                  {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Details
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="pt-3">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  minLength={6}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={isUpdatingPassword} className="gap-1.5">
                  {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="pt-3 space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium text-sm">Email Notifications</div>
                <div className="text-xs text-muted-foreground">
                  Receive status updates and milestone notices via email
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium text-sm">Invoice Due Reminders</div>
                <div className="text-xs text-muted-foreground">
                  Receive friendly reminders prior to invoice due dates
                </div>
              </div>
              <Switch
                checked={invoiceReminders}
                onCheckedChange={setInvoiceReminders}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleSavePreferences} className="gap-1.5">
                <Check className="w-4 h-4" /> Save Preferences
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
