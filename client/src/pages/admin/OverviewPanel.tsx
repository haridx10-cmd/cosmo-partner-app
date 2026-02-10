import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShoppingBag, AlertTriangle, CheckCircle, Activity, Clock, DollarSign, Scissors } from "lucide-react";

interface OverviewPanelProps {
  dateRange: { from: Date; to: Date };
  onTabChange: (tab: string) => void;
}

export default function OverviewPanel({ dateRange, onTabChange }: OverviewPanelProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/admin/overview', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      const res = await fetch(`/api/admin/overview?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const cards = [
    {
      label: "Ongoing Orders",
      value: stats?.ongoingOrders ?? 0,
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
      clickTab: null,
    },
    {
      label: "Open Issues",
      value: stats?.openIssues ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      clickTab: "issues",
    },
    {
      label: "Delayed Orders",
      value: stats?.delayedOrders ?? 0,
      icon: ShoppingBag,
      color: "text-orange-600",
      bg: "bg-orange-50",
      clickTab: "orders",
    },
    {
      label: "Completed Orders",
      value: stats?.completedOrders ?? 0,
      subtitle: stats?.completedValue ? `₹${stats.completedValue.toLocaleString()}` : undefined,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      clickTab: null,
    },
    {
      label: "Available Beauticians",
      value: stats?.availableBeauticians ?? 0,
      icon: Scissors,
      color: "text-purple-600",
      bg: "bg-purple-50",
      clickTab: "beauticians",
    },
    {
      label: "Total Employees",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      clickTab: "employees",
    },
    {
      label: "Active Now",
      value: stats?.activeEmployees ?? 0,
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-50",
      clickTab: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4" data-testid="overview-panel">
      {cards.map(({ label, value, subtitle, icon: Icon, color, bg, clickTab }) => (
        <Card
          key={label}
          className={`border-0 shadow-sm ${clickTab ? 'cursor-pointer hover-elevate' : ''}`}
          onClick={clickTab ? () => onTabChange(clickTab) : undefined}
          data-testid={`card-overview-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <CardContent className="p-4">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {subtitle && (
              <div className="text-sm font-semibold text-emerald-600 mt-0.5" data-testid="text-completed-value">{subtitle}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
