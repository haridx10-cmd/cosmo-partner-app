import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { User, MapPin, Clock, CreditCard } from "lucide-react";

export default function SmoothOrdersPanel() {
  const { data, isLoading } = useQuery({
    queryKey: [api.admin.allOrders.path],
    queryFn: async () => {
      const res = await fetch(api.admin.allOrders.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const smoothOrders = (data || []).filter((item: any) => !item.order.hasIssue);

  return (
    <div className="space-y-3 mt-4" data-testid="smooth-orders-panel">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Smooth Orders ({smoothOrders.length})</h3>
      </div>
      {smoothOrders.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-muted-foreground">No smooth orders found</CardContent></Card>
      ) : (
        smoothOrders.map(({ order, employeeName }: any) => (
          <Card key={order.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xs text-muted-foreground">Order #{order.id}</div>
                  <div className="font-semibold text-gray-900">{order.customerName}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <User className="w-3.5 h-3.5 text-primary/70" />
                  <span className="truncate">{employeeName || "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <CreditCard className="w-3.5 h-3.5 text-primary/70" />
                  <span>&#8377;{order.amount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-primary/70" />
                  <span>{format(new Date(order.appointmentTime), "MMM d, h:mm a")}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-primary/70" />
                  <span className="truncate">{order.address.split(",")[0]}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
