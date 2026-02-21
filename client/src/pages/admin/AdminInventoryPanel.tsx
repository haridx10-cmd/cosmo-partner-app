import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Boxes, IndianRupee, User } from "lucide-react";

type StockRow = {
  productId: number;
  productName: string;
  unit: string;
  lowStockThreshold: number;
  totalPurchased: number;
  totalUsed: number;
  stockLeft: number;
  costPerUnit: number;
};

type UsageRow = {
  beauticianId: number;
  beauticianName: string;
  totalUsageValue: number;
  totalUsageQty: number;
};

type InventorySummary = {
  stock: StockRow[];
  totalPurchaseValue: number;
  totalConsumptionValue: number;
  usageByBeautician: UsageRow[];
};

export default function AdminInventoryPanel() {
  const { data, isLoading } = useQuery<InventorySummary>({
    queryKey: ["/api/admin/inventory/summary"],
    queryFn: async () => {
      const res = await fetch("/api/admin/inventory/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory summary");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4" data-testid="admin-inventory-panel">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Products</div>
            <div className="text-xl font-bold mt-1">{data?.stock.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Purchase Value</div>
            <div className="text-xl font-bold mt-1">₹{Math.round(data?.totalPurchaseValue ?? 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Consumption Value</div>
            <div className="text-xl font-bold mt-1">₹{Math.round(data?.totalConsumptionValue ?? 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Low Stock Items</div>
            <div className="text-xl font-bold mt-1">
              {(data?.stock || []).filter((s) => s.stockLeft < s.lowStockThreshold).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Boxes className="w-4 h-4" /> Stock Levels
          </h3>
          <div className="space-y-2">
            {(data?.stock || []).map((row) => {
              const isLow = row.stockLeft < row.lowStockThreshold;
              return (
                <div key={row.productId} className={`border rounded-md p-3 ${isLow ? "bg-red-50 border-red-200" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{row.productName}</div>
                      <div className="text-xs text-muted-foreground">Unit: {row.unit}</div>
                    </div>
                    {isLow && <Badge variant="destructive">Low stock</Badge>}
                  </div>
                  <div className="text-sm mt-2 grid grid-cols-3 gap-2">
                    <span>In: {row.totalPurchased.toFixed(2)}</span>
                    <span>Out: {row.totalUsed.toFixed(2)}</span>
                    <span>Left: {row.stockLeft.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> Usage By Beautician
          </h3>
          <div className="space-y-2">
            {(data?.usageByBeautician || []).map((row) => (
              <div key={row.beauticianId} className="border rounded-md p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{row.beauticianName}</div>
                  <div className="text-xs text-muted-foreground">Qty used: {row.totalUsageQty.toFixed(2)}</div>
                </div>
                <div className="text-sm font-semibold flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  {Math.round(row.totalUsageValue).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

