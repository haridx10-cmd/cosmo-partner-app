import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShoppingBag, AlertTriangle, CheckCircle, Activity } from "lucide-react";

export default function OverviewPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: [api.admin.overview.path],
    queryFn: async () => {
      const res = await fetch(api.admin.overview.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const cards = [
    { label: "Total Employees", value: stats?.totalEmployees ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Now", value: stats?.activeEmployees ?? 0, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Orders", value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Open Issues", value: stats?.openIssues ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Completed Today", value: stats?.completedToday ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4" data-testid="overview-panel">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
