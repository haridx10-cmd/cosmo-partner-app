import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface DelayRiskResult {
  employeeId: number;
  employeeName: string | null;
  orderId: number;
  customerName: string;
  address: string;
  orderNum: number | null;
  appointmentTime: string;
  expectedArrivalTime: string;
  delayMinutes: number;
  riskLevel: "at_risk" | "delayed";
  hasActiveSession: boolean;
  sessionStartedAt: string | null;
}

interface DelayRiskResponse {
  results: DelayRiskResult[];
  computedAt: string;
}

export default function DelayRiskPanel({ dateRange }: { dateRange: { from: Date; to: Date } }) {
  const { data, isLoading } = useQuery<DelayRiskResponse>({
    queryKey: ["/api/admin/delay-risk", dateRange.from.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/delay-risk?date=${dateRange.from.toISOString()}`);
      if (!res.ok) throw new Error("Failed to fetch delay risk data");
      return res.json();
    },
    refetchInterval: 2 * 60 * 1000, // poll every 2 minutes
    staleTime: 90 * 1000,
  });

  const results = data?.results ?? [];
  const delayed = results.filter(r => r.riskLevel === "delayed");
  const atRisk = results.filter(r => r.riskLevel === "at_risk");

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
        Analysing schedule...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
        <p className="font-semibold text-green-700">All beauticians on schedule</p>
        <p className="text-sm text-muted-foreground mt-1">
          Refreshed at {data ? format(new Date(data.computedAt), "h:mm a") : "—"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {delayed.length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {delayed.length} Delayed
            </div>
          )}
          {atRisk.length > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              {atRisk.length} At Risk
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          Auto-refreshes every 2 min · Last: {data ? format(new Date(data.computedAt), "h:mm a") : "—"}
        </span>
      </div>

      <div className="space-y-3">
        {results.map((r) => (
          <Card
            key={`${r.employeeId}-${r.orderId}`}
            className={`border-l-4 ${r.riskLevel === "delayed" ? "border-l-red-500 bg-red-50/30" : "border-l-orange-400 bg-orange-50/30"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{r.employeeName ?? "Unassigned"}</span>
                    {r.orderNum && (
                      <Badge variant="outline" className="text-xs">Slot {r.orderNum}</Badge>
                    )}
                    <Badge
                      className={`text-xs ${r.riskLevel === "delayed" ? "bg-red-100 text-red-700 border-red-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}
                      variant="outline"
                    >
                      {r.riskLevel === "delayed" ? `${r.delayMinutes}m delayed` : `${r.delayMinutes}m at risk`}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 font-medium">{r.customerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>
                      <span className="font-medium text-gray-700">Appt:</span>{" "}
                      {format(new Date(r.appointmentTime), "h:mm a")}
                    </span>
                    <span>
                      <span className="font-medium text-gray-700">ETA:</span>{" "}
                      {format(new Date(r.expectedArrivalTime), "h:mm a")}
                    </span>
                    {r.hasActiveSession && r.sessionStartedAt && (
                      <span className="text-blue-600">
                        Service started {format(new Date(r.sessionStartedAt), "h:mm a")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
