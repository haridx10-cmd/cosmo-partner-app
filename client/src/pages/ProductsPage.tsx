import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

type InventoryProduct = {
  id: number;
  name: string;
  unit: string;
  costPerUnit: string | number;
  lowStockThreshold: string | number;
};

type ProductRequest = {
  id: number;
  productName: string;
  quantityRequested: string | number;
  status: string;
  requestedAt: string | null;
};

type StockSummary = {
  productId: number;
  productName: string;
  unit: string;
  lowStockThreshold: number;
  totalPurchased: number;
  totalUsed: number;
  stockLeft: number;
  costPerUnit: number;
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantityRequested, setQuantityRequested] = useState<string>("");

  const { data: products = [] } = useQuery<InventoryProduct[]>({
    queryKey: [api.inventory.products.path],
    queryFn: async () => {
      const res = await fetch(api.inventory.products.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: myRequests = [] } = useQuery<ProductRequest[]>({
    queryKey: [api.inventory.myRequests.path],
    queryFn: async () => {
      const res = await fetch(api.inventory.myRequests.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  const { data: stockSummary = [] } = useQuery<StockSummary[]>({
    queryKey: [api.inventory.stockSummary.path],
    queryFn: async () => {
      const res = await fetch(api.inventory.stockSummary.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stock summary");
      return res.json();
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.inventory.createRequest.path, {
        method: api.inventory.createRequest.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: Number(selectedProductId),
          quantityRequested: Number(quantityRequested),
        }),
      });
      if (!res.ok) throw new Error("Failed to create request");
      return res.json();
    },
    onSuccess: () => {
      setSelectedProductId("");
      setQuantityRequested("");
      queryClient.invalidateQueries({ queryKey: [api.inventory.myRequests.path] });
      toast({ title: "Request submitted" });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  const totals = useMemo(() => {
    const totalPurchased = stockSummary.reduce((sum, p) => sum + p.totalPurchased, 0);
    const totalUsed = stockSummary.reduce((sum, p) => sum + p.totalUsed, 0);
    return {
      totalPurchased,
      totalUsed,
      stockLeft: totalPurchased - totalUsed,
    };
  }, [stockSummary]);

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold font-display text-gray-900 mb-4">Inventory</h1>

      <Tabs defaultValue="raise" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="raise">Raise Request</TabsTrigger>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="stock">Stock Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="raise">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Raise Product Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Product</p>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantity Required</p>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantityRequested}
                  onChange={(e) => setQuantityRequested(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>

              <Button
                className="w-full"
                disabled={!selectedProductId || !quantityRequested || requestMutation.isPending}
                onClick={() => requestMutation.mutate()}
              >
                Submit Request
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {myRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((r) => (
                    <div key={r.id} className="border rounded-md p-3">
                      <p className="font-medium">{r.productName}</p>
                      <p className="text-sm text-muted-foreground">Qty: {r.quantityRequested}</p>
                      <p className="text-sm capitalize">Status: {r.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white border rounded-md p-2">
                  <p className="text-muted-foreground">Purchased</p>
                  <p className="font-bold">{totals.totalPurchased.toFixed(2)}</p>
                </div>
                <div className="bg-white border rounded-md p-2">
                  <p className="text-muted-foreground">Used</p>
                  <p className="font-bold">{totals.totalUsed.toFixed(2)}</p>
                </div>
                <div className="bg-white border rounded-md p-2">
                  <p className="text-muted-foreground">Stock Left</p>
                  <p className="font-bold">{totals.stockLeft.toFixed(2)}</p>
                </div>
              </div>

              {stockSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock data available.</p>
              ) : (
                <div className="space-y-2">
                  {stockSummary.map((s) => {
                    const isLow = s.stockLeft < s.lowStockThreshold;
                    return (
                      <div key={s.productId} className={`border rounded-md p-3 ${isLow ? "border-red-300 bg-red-50" : ""}`}>
                        <p className="font-medium">{s.productName}</p>
                        <p className="text-xs text-muted-foreground">Unit: {s.unit}</p>
                        <div className="text-sm mt-1 grid grid-cols-3 gap-1">
                          <span>In: {s.totalPurchased.toFixed(2)}</span>
                          <span>Out: {s.totalUsed.toFixed(2)}</span>
                          <span>Left: {s.stockLeft.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

