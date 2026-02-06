import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Clock, MapPin, Eye } from "lucide-react";

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

type TrackingEmployee = {
  id: number;
  name: string;
  isOnline: boolean | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  hasActiveIssue: boolean;
  currentOrderStatus: string | null;
};

type TrailPoint = {
  id: number;
  beauticianId: number;
  orderId: number | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  status: string;
  timestamp: string;
};

export default function TrackingPanel() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);

  const { data: tracking, isLoading } = useQuery<TrackingEmployee[]>({
    queryKey: [api.admin.tracking.path],
    queryFn: async () => {
      const res = await fetch(api.admin.tracking.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tracking data");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: trail } = useQuery<TrailPoint[]>({
    queryKey: ['/api/tracking/beautician', selectedEmployee],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      const url = buildUrl(api.tracking.historyByBeautician.path, { beauticianId: selectedEmployee });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trail");
      return res.json();
    },
    enabled: !!selectedEmployee,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <Skeleton className="h-96 mt-4" />;
  }

  const activeEmployees = (tracking || []).filter((e) =>
    e.currentLatitude && e.currentLongitude
  );

  const defaultCenter: [number, number] = activeEmployees.length > 0
    ? [activeEmployees[0].currentLatitude!, activeEmployees[0].currentLongitude!]
    : [19.076, 72.8777];

  const getMarkerColor = (emp: TrackingEmployee) => {
    if (!emp.isOnline) return "gray";
    if (emp.hasActiveIssue) return "orange";
    return "green";
  };

  const getStatusLabel = (emp: TrackingEmployee) => {
    if (!emp.isOnline) return "Offline";
    if (emp.hasActiveIssue) return "Issue";
    if (emp.currentOrderStatus === "confirmed") return "On Job";
    return "Online";
  };

  const trailPositions: [number, number][] = trail
    ? trail.map((p) => [p.latitude, p.longitude] as [number, number]).reverse()
    : [];

  const getSpeedDisplay = (speed: number | null) => {
    if (speed === null || speed === undefined) return "N/A";
    const kmh = speed * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  const getTrailPointColor = (status: string) => {
    switch (status) {
      case "traveling": return "#3b82f6";
      case "at_location": return "#22c55e";
      default: return "#9ca3af";
    }
  };

  return (
    <div className="mt-4 space-y-4" data-testid="tracking-panel">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Issue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span>Offline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Trail (Traveling)</span>
          </div>
        </div>
        {selectedEmployee && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedEmployee(null)}
            data-testid="button-clear-trail"
          >
            Clear Trail
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm overflow-visible">
        <CardContent className="p-0">
          <div className="h-[450px] rounded-lg overflow-hidden relative z-0">
            <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom={true} className="h-full w-full z-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {trailPositions.length > 1 && (
                <Polyline
                  positions={trailPositions}
                  pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.7, dashArray: "8, 4" }}
                />
              )}

              {trail && trail.slice(0, 50).map((point, idx) => (
                <CircleMarker
                  key={point.id}
                  center={[point.latitude, point.longitude]}
                  radius={idx === 0 ? 6 : 3}
                  pathOptions={{
                    color: getTrailPointColor(point.status),
                    fillColor: getTrailPointColor(point.status),
                    fillOpacity: idx === 0 ? 1 : 0.6,
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <div className="font-semibold">{point.status}</div>
                      <div>Speed: {getSpeedDisplay(point.speed)}</div>
                      <div>Time: {new Date(point.timestamp).toLocaleTimeString()}</div>
                      {point.accuracy && <div>Accuracy: {point.accuracy.toFixed(0)}m</div>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {activeEmployees.map((emp) => (
                <Marker key={emp.id} position={[emp.currentLatitude!, emp.currentLongitude!]}>
                  <Popup>
                    <div className="text-sm space-y-1">
                      <div className="font-bold">{emp.name}</div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getMarkerColor(emp) }} />
                        <span>{getStatusLabel(emp)}</span>
                      </div>
                      {emp.currentOrderStatus && (
                        <div className="text-xs text-gray-500">Order: {emp.currentOrderStatus}</div>
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
        {(tracking || []).map((emp) => (
          <Card
            key={emp.id}
            className={`border-0 shadow-sm ${selectedEmployee === emp.id ? 'ring-2 ring-primary' : ''}`}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: getMarkerColor(emp) }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate" data-testid={`text-employee-name-${emp.id}`}>
                  {emp.name}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{getStatusLabel(emp)}</span>
                  {emp.currentOrderStatus && (
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {emp.currentOrderStatus}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {emp.currentLatitude && (
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {emp.currentLatitude.toFixed(3)}, {emp.currentLongitude?.toFixed(3)}
                  </div>
                )}
                {emp.isOnline && emp.currentLatitude && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedEmployee(selectedEmployee === emp.id ? null : emp.id)}
                    data-testid={`button-view-trail-${emp.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEmployee && trail && trail.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Movement Trail ({trail.length} points)
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {trail.slice(0, 20).map((point) => (
                <div key={point.id} className="flex items-center gap-2 text-xs border-b border-border/50 pb-1.5">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getTrailPointColor(point.status) }}
                  />
                  <span className="font-medium capitalize w-20">{point.status}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(point.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {getSpeedDisplay(point.speed)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
