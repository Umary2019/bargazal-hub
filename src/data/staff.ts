import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { createStaff, listStaff, removeStaff, resetStaffPassword } from "@/lib/staff.functions";
import { notifyError } from "@/lib/errors";

const KEY = ["staff"] as const;

export function useStaff(enabled = true) {
  const fetchStaff = useServerFn(listStaff);
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: () => fetchStaff(),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  const call = useServerFn(createStaff);
  return useMutation({
    mutationFn: (values: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      position?: string;
    }) => call({ data: values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Staff account created");
    },
    onError: (error) => notifyError(error, "Could not create staff account"),
  });
}

export function useRemoveStaff() {
  const qc = useQueryClient();
  const call = useServerFn(removeStaff);
  return useMutation({
    mutationFn: (user_id: string) => call({ data: { user_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Staff access removed");
    },
    onError: (error) => notifyError(error, "Could not remove staff access"),
  });
}

export function useResetStaffPassword() {
  const call = useServerFn(resetStaffPassword);
  return useMutation({
    mutationFn: (values: { user_id: string; password: string }) => call({ data: values }),
    onSuccess: () => toast.success("Password updated"),
    onError: (error) => notifyError(error, "Could not update password"),
  });
}
