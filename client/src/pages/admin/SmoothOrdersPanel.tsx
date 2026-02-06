import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { User, MapPin, Clock, CreditCard } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SmoothOrdersPanel() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: [api.admin.allOrders.path],
    queryFn: async () => {
      const res = await fetch(api.admin.allOrders.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: employeesList } = useQuery({
    queryKey: [api.admin.allEmployees.path],
    queryFn: async () => {
      const res = await fetch(api.admin.allEmployees.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ orderId, employeeId }: { orderId: number; employeeId: number | null }) => {
      const url = buildUrl(api.admin.assignOrder.path, { id: orderId });
      await apiRequest("PATCH", url, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.allOrders.path] });
      toast({ title: "Order assigned successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to assign", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const allOrders = data || [];
  const beauticians = (employeesList || []).filter((e: any) => e.role === "employee");

  return (
    <div className="space-y-3 mt-4" data-testid="smooth-orders-panel">
      <div className="flex justify-between items-center flex-wrap gap-1">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">All Orders ({allOrders.length})</h3>
      </div>
      {allOrders.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">No orders found</CardContent></Card>
      ) : (
        allOrders.map(({ order, employeeName }: any) => (
          <Card key={order.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3 flex-wrap gap-1">
                <div>
                  <div className="text-xs text-muted-foreground">Order #{order.id}</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{order.customerName}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CreditCard className="w-3.5 h-3.5 text-primary/70" />
                  <span>&#8377;{order.amount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary/70" />
                  <span>{format(new Date(order.appointmentTime), "MMM d, h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-primary/70" />
                  <span className="truncate">{order.address.split(",")[0]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                <span className="text-sm text-muted-foreground shrink-0">Assign to:</span>
                <Select
                  value={order.employeeId ? String(order.employeeId) : "unassigned"}
                  onValueChange={(val) => {
                    const empId = val === "unassigned" ? null : Number(val);
                    assignMutation.mutate({ orderId: order.id, employeeId: empId });
                  }}
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger
                    className="h-8 w-auto min-w-[140px] text-sm"
                    data-testid={`select-assign-${order.id}`}
                  >
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {beauticians.map((emp: any) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
