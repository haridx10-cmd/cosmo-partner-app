import { useMutation, useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

type CancelledOrderRow = {
  order: {
    id: number;
    customerName: string;
    status: string;
    appointmentTime: string;
    acceptanceStatus?: string;
  };
  employeeName: string | null;
};

function CancellationList({ rows, allowReallocate }: { rows: CancelledOrderRow[]; allowReallocate: boolean }) {
  const reallocateMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch(`/api/admin/cancellations/${orderId}/reallocate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reallocate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cancellations/customer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cancellations/beautician"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/routing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
  });

  if (!rows.length) {
    return <Card><CardContent className="p-6 text-center text-muted-foreground">No cancelled orders found.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.order.id}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Order #{row.order.id} - {row.order.customerName}</p>
              <p className="text-sm text-muted-foreground">Beautician: {row.employeeName || "Unassigned"}</p>
              <p className="text-xs text-muted-foreground">Reason: {row.order.acceptanceStatus || "-"}</p>
            </div>
            {allowReallocate && (
              <Button
                size="sm"
                onClick={() => reallocateMutation.mutate(row.order.id)}
                disabled={reallocateMutation.isPending}
              >
                Reallocate
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CancellationsPanel() {
  const { data: customer = [], isLoading: loadingCustomer } = useQuery<CancelledOrderRow[]>({
    queryKey: ["/api/admin/cancellations/customer"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cancellations/customer", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customer cancellations");
      return res.json();
    },
  });

  const { data: beautician = [], isLoading: loadingBeautician } = useQuery<CancelledOrderRow[]>({
    queryKey: ["/api/admin/cancellations/beautician"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cancellations/beautician", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch beautician cancellations");
      return res.json();
    },
  });

  if (loadingCustomer || loadingBeautician) {
    return <div className="mt-4 text-sm text-muted-foreground">Loading cancellations...</div>;
  }

  return (
    <div className="mt-4">
      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="customer">Customer Cancellations</TabsTrigger>
          <TabsTrigger value="beautician">Beautician Cancellations</TabsTrigger>
        </TabsList>
        <TabsContent value="customer" className="mt-3">
          <CancellationList rows={customer} allowReallocate={false} />
        </TabsContent>
        <TabsContent value="beautician" className="mt-3">
          <CancellationList rows={beautician} allowReallocate />
        </TabsContent>
      </Tabs>
    </div>
  );
}
