import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MapPin, Scissors } from "lucide-react";

interface BeauticiansPanelProps {
  dateRange: { from: Date; to: Date };
}

type Beautician = {
  id: number;
  name: string;
  mobile: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  slot1: string;
  slot2: string;
  slot3: string;
  nextSlotArea: string | null;
  lastSlot: boolean;
  totalOrders: number;
};

function SlotCell({ value }: { value: string }) {
  const colors: Record<string, string> = {
    Y: "bg-green-100 text-green-800",
    N: "bg-red-100 text-red-800",
    WND: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold ${colors[value] || colors.WND}`}>
      {value}
    </span>
  );
}

function StatusBadgeLocal({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    online: { label: "Online", className: "bg-green-500 text-white border-0" },
    offline: { label: "Offline", className: "bg-gray-400 text-white border-0" },
    on_job: { label: "On Job", className: "bg-blue-500 text-white border-0" },
  };
  const c = config[status] || config.offline;
  return <Badge className={`text-[10px] h-5 ${c.className}`}>{c.label}</Badge>;
}

export default function BeauticiansPanel({ dateRange }: BeauticiansPanelProps) {
  const { data: beauticians, isLoading } = useQuery<Beautician[]>({
    queryKey: ['/api/admin/beauticians', dateRange.from.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/admin/beauticians?date=${dateRange.from.toISOString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch beauticians");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-4 mt-4" data-testid="beauticians-panel">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          Beauticians ({(beauticians || []).length})
        </h3>
      </div>

      <Card className="border-0 shadow-sm overflow-visible">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-beauticians">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Location</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">10-12</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">12-3</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">3-7</th>
                  <th className="text-left p-3 font-medium text-muted-foreground text-xs">Next Area</th>
                  <th className="text-center p-3 font-medium text-muted-foreground text-xs">Last Slot</th>
                </tr>
              </thead>
              <tbody>
                {(beauticians || []).map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover-elevate" data-testid={`row-beautician-${b.id}`}>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{b.name}</div>
                      {b.mobile && (
                        <a
                          href={`tel:${b.mobile}`}
                          className="text-xs text-primary flex items-center gap-1 mt-0.5"
                          data-testid={`link-call-beautician-${b.id}`}
                        >
                          <Phone className="w-3 h-3" />
                          {b.mobile}
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadgeLocal status={b.status} />
                    </td>
                    <td className="p-3">
                      {b.latitude && b.longitude ? (
                        <a
                          href={`https://maps.google.com/?q=${b.latitude},${b.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary flex items-center gap-1"
                          data-testid={`link-location-${b.id}`}
                        >
                          <MapPin className="w-3 h-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-center"><SlotCell value={b.slot1} /></td>
                    <td className="p-3 text-center"><SlotCell value={b.slot2} /></td>
                    <td className="p-3 text-center"><SlotCell value={b.slot3} /></td>
                    <td className="p-3">
                      <span className="text-xs text-gray-700 max-w-[140px] truncate block">
                        {b.nextSlotArea || "-"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {b.lastSlot ? (
                        <Badge variant="secondary" className="text-[10px]">YES</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">NO</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(beauticians || []).length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No beauticians found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
