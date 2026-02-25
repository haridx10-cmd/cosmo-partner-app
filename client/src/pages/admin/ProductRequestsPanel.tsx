import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";

type ProductRequestRow = {
  id: number;
  quantityRequested: string | number;
  quantityApproved?: string | number | null;
  status: string;
  productName: string;
  beauticianName: string;
};

export default function ProductRequestsPanel() {
  const [partialQty, setPartialQty] = useState<Record<number, string>>({});

  const { data = [], isLoading } = useQuery<ProductRequestRow[]>({
    queryKey: ["/api/admin/product-requests"],
    queryFn: async () => {
      const res = await fetch("/api/admin/product-requests", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch product requests");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, quantityApproved }: { id: number; quantityApproved: number }) => {
      const res = await fetch(`/api/admin/product-requests/${id}/approve`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantityApproved }),
      });
      if (!res.ok) throw new Error("Failed to update request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-requests"] });
    },
  });

  const rows = useMemo(() => data, [data]);

  if (isLoading) return <div className="mt-4 text-sm text-muted-foreground">Loading product requests...</div>;

  return (
    <div className="space-y-3 mt-4" data-testid="product-requests-panel">
      {rows.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No product requests found.</CardContent></Card>
      ) : (
        rows.map((row) => {
          const requested = Number(row.quantityRequested);
          const currentPartial = partialQty[row.id] ?? String(requested);
          return (
            <Card key={row.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold">{row.productName}</p>
                    <p className="text-sm text-muted-foreground">Beautician: {row.beauticianName}</p>
                    <p className="text-sm text-muted-foreground">Requested: {requested}</p>
                  </div>
                  <span className="text-xs uppercase px-2 py-1 rounded border">{row.status}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ id: row.id, quantityApproved: requested })}
                  >
                    Approve Full
                  </Button>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentPartial}
                      onChange={(e) => setPartialQty((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ id: row.id, quantityApproved: Number(currentPartial || 0) })}
                    >
                      Partial
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ id: row.id, quantityApproved: 0 })}
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
