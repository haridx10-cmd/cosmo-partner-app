import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type IssueInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function useBeautician() {
  const { user } = useAuth();
  return {
    data: user ? {
      id: user.id,
      name: user.name,
      isOnline: user.isOnline,
      currentLatitude: user.currentLatitude,
      currentLongitude: user.currentLongitude,
    } : null,
    isLoading: false,
  };
}

export function useToggleShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (action: 'start_shift' | 'end_shift') => {
      const res = await fetch(api.employee.toggleShift.path, {
        method: api.employee.toggleShift.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update shift status");
      return api.employee.toggleShift.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      toast({
        title: data.success ? "Status Updated" : "Update Failed",
        description: `You are now ${data.state}`,
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not update shift status. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateLocation() {
  return useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      const res = await fetch(api.employee.updateLocation.path, {
        method: api.employee.updateLocation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update location");
      return api.employee.updateLocation.responses[200].parse(await res.json());
    },
  });
}

export function useCreateIssue() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: IssueInput) => {
      const res = await fetch(api.issues.create.path, {
        method: api.issues.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to report issue");
      return api.issues.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({
        title: "Issue Reported",
        description: "Support team has been notified.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to report issue.",
        variant: "destructive",
      });
    },
  });
}
