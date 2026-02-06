import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export default function TrackingPanel() {
  const { data: tracking, isLoading } = useQuery({
    queryKey: [api.admin.tracking.path],
    queryFn: async () => {
      const res = await fetch(api.admin.tracking.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tracking data");
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <Skeleton className="h-96 mt-4" />;
  }

  const activeEmployees = (tracking || []).filter((e: any) =>
    e.currentLatitude && e.currentLongitude
  );

  const defaultCenter: [number, number] = activeEmployees.length > 0
    ? [activeEmployees[0].currentLatitude, activeEmployees[0].currentLongitude]
    : [19.076, 72.8777]; // Mumbai default

  const getMarkerColor = (emp: any) => {
    if (!emp.isOnline) return "gray";
    if (emp.hasActiveIssue) return "orange";
    return "green";
  };

  return (
    <div className="mt-4 space-y-4" data-testid="tracking-panel">
      <div className="flex gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Smooth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>Issue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>Offline</span>
        </div>
      </div>

      <Card className="border-0 shadow-sm overflow-visible">
        <CardContent className="p-0">
          <div className="h-[400px] rounded-lg overflow-hidden relative z-0">
            <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom={true} className="h-full w-full z-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {activeEmployees.map((emp: any) => (
                <Marker key={emp.id} position={[emp.currentLatitude, emp.currentLongitude]}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold">{emp.name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getMarkerColor(emp) }} />
                        <span>{emp.isOnline ? (emp.hasActiveIssue ? "Has Issue" : "Smooth") : "Offline"}</span>
                      </div>
                      {emp.currentOrderStatus && (
                        <div className="mt-1 text-xs text-gray-500">Order: {emp.currentOrderStatus}</div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(tracking || []).map((emp: any) => (
          <Card key={emp.id} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: getMarkerColor(emp) }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{emp.name}</div>
                <div className="text-xs text-muted-foreground">
                  {emp.isOnline ? "Online" : "Offline"}
                  {emp.hasActiveIssue ? " - Issue Active" : ""}
                </div>
              </div>
              {emp.currentLatitude && (
                <div className="text-xs text-muted-foreground">
                  {emp.currentLatitude.toFixed(2)}, {emp.currentLongitude.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
