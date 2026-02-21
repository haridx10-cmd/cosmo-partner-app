import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Wallet, BarChart3, ListChecks } from "lucide-react";
import { api } from "@shared/routes";

type WalletMonthly = {
  completedOrders: number;
  totalRevenue: number;
  totalCommission: number;
  serviceBreakdown: Array<{ serviceName: string; count: number }>;
};

export default function WalletPage() {
  const { data, isLoading } = useQuery<WalletMonthly>({
    queryKey: [api.wallet.monthly.path],
    queryFn: async () => {
      const res = await fetch(api.wallet.monthly.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet data");
      return res.json();
    },
    refetchInterval: 15000,
  });

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold font-display text-gray-900 mb-6">Wallet</h1>

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white mb-6">
        <p className="text-gray-300 text-sm">Current Month Revenue</p>
        <h2 className="text-4xl font-bold mt-1">{isLoading ? "..." : `${data?.totalRevenue ?? 0}`}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <ListChecks className="w-4 h-4" /> Completed Orders
          </div>
          <p className="text-xl font-bold">{isLoading ? "..." : data?.completedOrders ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Wallet className="w-4 h-4" /> Commission
          </div>
          <p className="text-xl font-bold">{isLoading ? "..." : data?.totalCommission ?? 0}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4" />
          <h3 className="font-semibold">Service Count Breakdown</h3>
        </div>
        {!data?.serviceBreakdown?.length ? (
          <p className="text-sm text-muted-foreground">No completed services this month.</p>
        ) : (
          <div className="space-y-2">
            {data.serviceBreakdown.map((s) => (
              <div key={s.serviceName} className="flex justify-between text-sm">
                <span>{s.serviceName}</span>
                <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

