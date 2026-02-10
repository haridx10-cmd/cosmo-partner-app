import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Phone, MapPin, Clock, Route, User } from "lucide-react";

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
};

function getTimeGroup(time: string): string {
  const h = new Date(time).getHours();
  const m = new Date(time).getMinutes();
  const totalMins = h * 60 + m;
  if (totalMins < 690) return "Morning (10:00 - 11:30)";
  if (totalMins < 930) return "Afternoon (11:30 - 3:30)";
  return "Evening (After 3:30)";
}

function getOrderStatusInfo(order: RoutingOrder): { label: string; color: string } {
  if (order.status === "cancelled") return { label: "Cancelled", color: "bg-gray-400 text-white" };
  if (order.status === "completed") return { label: "Completed", color: "bg-green-500 text-white" };
  const apptTime = new Date(order.appointmentTime).getTime();
  const now = Date.now();
  const fifteenMins = 15 * 60 * 1000;
  if (order.status === "in_progress") return { label: "Ongoing", color: "bg-blue-500 text-white" };
  if (now > apptTime + fifteenMins && order.status !== "completed") {
    return { label: "Delayed", color: "bg-red-500 text-white" };
  }
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
  const groups: Record<string, RoutingOrder[]> = {};
  const groupOrder = ["Morning (10:00 - 11:30)", "Afternoon (11:30 - 3:30)", "Evening (After 3:30)"];
  groupOrder.forEach(g => { groups[g] = []; });
  allOrders.forEach(order => {
    const group = getTimeGroup(order.appointmentTime);
    if (!groups[group]) groups[group] = [];
    groups[group].push(order);
  });

  return (
    <div className="space-y-4 mt-4" data-testid="routing-panel">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
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

      {groupOrder.map(groupName => {
        const groupOrders = groups[groupName] || [];
        if (groupOrders.length === 0) return null;
        return (
          <Card key={groupName} className="border-0 shadow-sm overflow-visible">
            <CardContent className="p-0">
              <div className="px-4 py-2.5 bg-muted/30 border-b">
                <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {groupName} ({groupOrders.length})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs">Customer</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs">Time</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs">Location</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs">Value</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs">Services</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs">Beautician</th>
                      <th className="text-center p-3 font-medium text-muted-foreground text-xs">Acceptance</th>
                      <th className="text-center p-3 font-medium text-muted-foreground text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupOrders.map(order => {
                      const statusInfo = getOrderStatusInfo(order);
                      const locationUrl = getLocationUrl(order);
                      const currentEmployeeId = routingMode === "simulator" && order.id in simulatedAssignments
                        ? simulatedAssignments[order.id]
                        : order.employeeId;
                      return (
                        <tr key={order.id} className="border-b last:border-0" data-testid={`row-routing-order-${order.id}`}>
                          <td className="p-3">
                            <div className="font-medium text-gray-900 text-xs">{order.customerName}</div>
                            <a
                              href={`tel:${order.phone}`}
                              className="text-xs text-primary flex items-center gap-1 mt-0.5"
                              data-testid={`link-call-customer-${order.id}`}
                            >
                              <Phone className="w-3 h-3" />
                              {order.phone}
                            </a>
                          </td>
                          <td className="p-3 text-xs text-gray-700 whitespace-nowrap">
                            {format(new Date(order.appointmentTime), "h:mm a")}
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
                          <td className="p-3 text-right text-xs font-medium text-gray-900 whitespace-nowrap">
                            ₹{order.amount}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {(order.services || []).map((s: any, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px] h-4 whitespace-nowrap">{s.name}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-3">
                            <Select
                              value={currentEmployeeId ? String(currentEmployeeId) : "unassigned"}
                              onValueChange={(v) => handleAssign(order.id, v === "unassigned" ? null : Number(v))}
                            >
                              <SelectTrigger className="w-[130px] text-xs h-8" data-testid={`select-assign-${order.id}`}>
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
                              <SelectTrigger className="w-[100px] text-xs h-8" data-testid={`select-acceptance-${order.id}`}>
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
            </CardContent>
          </Card>
        );
      })}

      {allOrders.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No orders found for this date
          </CardContent>
        </Card>
      )}
    </div>
  );
}
