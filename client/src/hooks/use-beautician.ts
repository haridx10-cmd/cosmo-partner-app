import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type IssueInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function useBeautician() {
  return useQuery({
    queryKey: [api.beautician.me.path],
    queryFn: async () => {
      const res = await fetch(api.beautician.me.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null; // Not set up as beautician yet
        throw new Error("Failed to fetch profile");
      }
      return api.beautician.me.responses[200].parse(await res.json());
    },
    // Don't refetch too aggressively for MVP
    staleTime: 1000 * 60 * 5, 
  });
}

export function useToggleShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (action: 'start_shift' | 'end_shift') => {
      const res = await fetch(api.beautician.toggleShift.path, {
        method: api.beautician.toggleShift.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update shift status");
      return api.beautician.toggleShift.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.beautician.me.path] });
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
      const res = await fetch(api.beautician.updateLocation.path, {
        method: api.beautician.updateLocation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update location");
      return api.beautician.updateLocation.responses[200].parse(await res.json());
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
