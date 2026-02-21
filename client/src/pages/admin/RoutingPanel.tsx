import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Phone, MapPin, Route, User } from "lucide-react";

interface RoutingPanelProps {
  dateRange: { from: Date; to: Date };
}

type RoutingOrder = {
  id: number;
  customerName: string;
  phone: string;
  address: string;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  services: { name: string; price: number }[];
  amount: number;
  duration: number;
  appointmentTime: string;
  status: string;
  employeeId: number | null;
  employeeName: string | null;
  acceptanceStatus: string | null;
  orderAreaName: string | null;
  orderNum: number | null;
  sheetDate: string | null;
  sheetTime: string | null;
};

function getOrderStatusInfo(order: RoutingOrder): { label: string; color: string } {
  if (order.status === "cancelled") return { label: "Cancelled", color: "bg-gray-400 text-white" };
  if (order.status === "completed") return { label: "Completed", color: "bg-green-500 text-white" };
  if (order.status === "in_progress") return { label: "Ongoing", color: "bg-blue-500 text-white" };
  return { label: order.status, color: "bg-yellow-500 text-white" };
}

function getLocationUrl(order: RoutingOrder): string | null {
  if (order.mapsUrl) return order.mapsUrl;
  if (order.latitude && order.longitude) return `https://maps.google.com/?q=${order.latitude},${order.longitude}`;
  if (order.address) return `https://maps.google.com/maps?q=${encodeURIComponent(order.address)}`;
  return null;
}

export default function RoutingPanel({ dateRange }: RoutingPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [routingMode, setRoutingMode] = useState<"actual" | "simulator">("actual");
  const [simulatedAssignments, setSimulatedAssignments] = useState<Record<number, number | null>>({});

  const { data: orders, isLoading } = useQuery<RoutingOrder[]>({
    queryKey: ['/api/admin/routing', dateRange.from.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/routing?date=${dateRange.from.toISOString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch routing data");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: employeesList } = useQuery({
    queryKey: ['/api/admin/employees'],
    queryFn: async () => {
      const res = await fetch('/api/admin/employees', { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ orderId, employeeId }: { orderId: number; employeeId: number | null }) => {
      await apiRequest("PATCH", `/api/admin/orders/${orderId}/assign`, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/routing'] });
      toast({ title: "Beautician assigned successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to assign", description: err.message, variant: "destructive" });
    },
  });

  const acceptanceMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/orders/${orderId}/acceptance`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/routing'] });
      toast({ title: "Acceptance status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const orderNumMutation = useMutation({
    mutationFn: async ({ orderId, orderNum }: { orderId: number; orderNum: number | null }) => {
      await apiRequest("PATCH", `/api/admin/orders/${orderId}/order-num`, { orderNum });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/routing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/beauticians'] });
      toast({ title: "Order number updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update order number", description: err.message, variant: "destructive" });
    },
  });

  const beauticians = (employeesList || []).filter((e: any) => e.role === "employee");

  const handleAssign = (orderId: number, employeeId: number | null) => {
    if (routingMode === "simulator") {
      setSimulatedAssignments(prev => ({ ...prev, [orderId]: employeeId }));
      toast({ title: "Simulated Assignment", description: "This change is local only." });
    } else {
      assignMutation.mutate({ orderId, employeeId });
    }
  };

  if (isLoading) {
    return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const allOrders = orders || [];

  return (
    <div className="space-y-4 mt-4" data-testid="routing-panel">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Route className="w-4 h-4" />
          Routing ({allOrders.length} orders)
        </h3>
        <div className="flex items-center gap-2">
          <Select value={routingMode} onValueChange={(v) => setRoutingMode(v as "actual" | "simulator")} data-testid="select-routing-mode">
            <SelectTrigger className="w-[160px] text-xs" data-testid="trigger-routing-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actual">Actual Routing</SelectItem>
              <SelectItem value="simulator">Route Simulator</SelectItem>
            </SelectContent>
          </Select>
          {routingMode === "simulator" && (
            <Badge variant="secondary" className="text-xs">Simulation Mode</Badge>
          )}
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-visible">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-routing">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Customer</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Time</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Location</th>
                  <th className="text-right p-3 font-medium text-muted-foreground text-xs">Value</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Services</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Order #</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Beautician</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Acceptance</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map(order => {
                  const statusInfo = getOrderStatusInfo(order);
                  const locationUrl = getLocationUrl(order);
                  const currentEmployeeId = routingMode === "simulator" && order.id in simulatedAssignments
                    ? simulatedAssignments[order.id]
                    : order.employeeId;
                  return (
                    <tr key={order.id} className="border-b last:border-0" data-testid={`row-routing-order-${order.id}`}>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">{order.customerName}</div>
                        <a
                          href={`tel:${order.phone}`}
                          className="text-xs text-primary flex items-center gap-1 mt-0.5"
                          data-testid={`link-call-customer-${order.id}`}
                        >
                          <Phone className="w-3 h-3" />
                          {order.phone}
                        </a>
                      </td>
                      <td className="p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap" data-testid={`text-date-${order.id}`}>
                        {order.sheetDate || "-"}
                      </td>
                      <td className="p-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap" data-testid={`text-time-${order.id}`}>
                        {order.sheetTime || "-"}
                      </td>
                      <td className="p-3">
                        {locationUrl ? (
                          <a
                            href={locationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 max-w-[120px]"
                            data-testid={`link-location-order-${order.id}`}
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{order.orderAreaName || "Map"}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {order.amount}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[160px] space-y-1">
                          {(order.services || []).map((s: any, i: number) => (
                            <div key={i} className="text-[11px] leading-4">
                              {s.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Select
                          value={order.orderNum ? String(order.orderNum) : "none"}
                          onValueChange={(v) => orderNumMutation.mutate({ orderId: order.id, orderNum: v === "none" ? null : Number(v) })}
                        >
                          <SelectTrigger className="w-[70px] text-xs" data-testid={`select-ordernum-${order.id}`}>
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Select
                          value={currentEmployeeId ? String(currentEmployeeId) : "unassigned"}
                          onValueChange={(v) => handleAssign(order.id, v === "unassigned" ? null : Number(v))}
                        >
                          <SelectTrigger className="w-[130px] text-xs" data-testid={`select-assign-${order.id}`}>
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {beauticians.map((b: any) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {b.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        <Select
                          value={order.acceptanceStatus || "pending"}
                          onValueChange={(v) => acceptanceMutation.mutate({ orderId: order.id, status: v })}
                        >
                          <SelectTrigger className="w-[100px] text-xs" data-testid={`select-acceptance-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] h-5 border-0 ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {allOrders.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No orders found for this date
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
