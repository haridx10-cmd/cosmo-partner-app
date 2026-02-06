import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation, Clock, MapPin, Eye, EyeOff, AlertTriangle, Zap } from "lucide-react";

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const SelectedIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  iconSize: [30, 45],
});

type TrackingEmployee = {
  id: number;
  name: string;
  isOnline: boolean | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  hasActiveIssue: boolean;
  currentOrderStatus: string | null;
  lastTrackingTime: string | null;
  lastSpeed: number | null;
  lastStatus: string | null;
  activeOrderId: number | null;
  activeOrderCustomer: string | null;
  serviceSessionId: number | null;
  serviceStartTime: string | null;
  expectedDurationMinutes: number | null;
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

function MapController({ center, zoom }: { center: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [center?.[0], center?.[1], zoom]);
  return null;
}

function getSpeedDisplay(speed: number | null) {
  if (speed === null || speed === undefined) return "N/A";
  const kmh = speed * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

function getTrailPointColor(status: string) {
  switch (status) {
    case "traveling": return "#3b82f6";
    case "at_location": return "#22c55e";
    default: return "#9ca3af";
  }
}

function getTimeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getServiceIndicator(emp: TrackingEmployee): { label: string; color: string } | null {
  if (!emp.serviceStartTime || !emp.expectedDurationMinutes) return null;
  const elapsed = (Date.now() - new Date(emp.serviceStartTime).getTime()) / 1000;
  const expectedSeconds = emp.expectedDurationMinutes * 60;
  const remaining = expectedSeconds - elapsed;
  const remainingMinutes = remaining / 60;

  if (remaining <= 0) return { label: "Delayed", color: "bg-red-500 text-white" };
  if (remainingMinutes <= 30) return { label: "Near Delay", color: "bg-orange-500 text-white" };
  return { label: "On Time", color: "bg-green-500 text-white" };
}

function formatServiceElapsed(startTime: string): string {
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = Math.floor(elapsed % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TrackingPanel() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [showTrail, setShowTrail] = useState(false);
  const [mapTarget, setMapTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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
    enabled: !!selectedEmployee && showTrail,
    refetchInterval: 15000,
  });

  const { data: latestPoint } = useQuery<TrailPoint | null>({
    queryKey: ['/api/tracking/live', selectedEmployee],
    queryFn: async () => {
      if (!selectedEmployee) return null;
      const url = buildUrl(api.tracking.liveByBeautician.path, { beauticianId: selectedEmployee });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch latest point");
      return res.json();
    },
    enabled: !!selectedEmployee,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <Skeleton className="h-96 mt-4" />;
  }

  const employeesWithLocation = (tracking || []).filter(
    (e) => e.currentLatitude && e.currentLongitude
  );

  const selectedEmp = tracking?.find((e) => e.id === selectedEmployee);

  const defaultCenter: [number, number] = employeesWithLocation.length > 0
    ? [employeesWithLocation[0].currentLatitude!, employeesWithLocation[0].currentLongitude!]
    : [19.076, 72.8777];

  const handleEmployeeClick = (emp: TrackingEmployee) => {
    if (selectedEmployee === emp.id) {
      setSelectedEmployee(null);
      setShowTrail(false);
      setMapTarget(null);
      return;
    }

    setSelectedEmployee(emp.id);
    setShowTrail(false);

    if (emp.currentLatitude && emp.currentLongitude) {
      setMapTarget({ center: [emp.currentLatitude, emp.currentLongitude], zoom: 15 });
    } else {
      console.warn(`Tracking missing for employee ${emp.name} (ID: ${emp.id})`);
    }
  };

  const handleToggleTrail = (empId: number) => {
    if (selectedEmployee === empId && showTrail) {
      setShowTrail(false);
    } else {
      setSelectedEmployee(empId);
      setShowTrail(true);
    }
  };

  const getMarkerColor = (emp: TrackingEmployee) => {
    if (!emp.isOnline) return "gray";
    if (emp.hasActiveIssue) return "orange";
    return "green";
  };

  const getStatusLabel = (emp: TrackingEmployee) => {
    if (!emp.isOnline) return "Offline";
    if (emp.hasActiveIssue) return "Issue";
    if (emp.lastStatus === "traveling") return "Traveling";
    if (emp.lastStatus === "at_location") return "At Location";
    if (emp.currentOrderStatus) return "On Job";
    return "Online";
  };

  const trailPositions: [number, number][] = trail
    ? trail.map((p) => [p.latitude, p.longitude] as [number, number]).reverse()
    : [];

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
            onClick={() => { setSelectedEmployee(null); setShowTrail(false); setMapTarget(null); }}
            data-testid="button-clear-selection"
          >
            Clear Selection
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

              <MapController
                center={mapTarget?.center ?? null}
                zoom={mapTarget?.zoom ?? 11}
              />

              {showTrail && trailPositions.length > 1 && (
                <Polyline
                  positions={trailPositions}
                  pathOptions={{ color: "#3b82f6", weight: 3, opacity: 0.7, dashArray: "8, 4" }}
                />
              )}

              {showTrail && trail && trail.slice(0, 50).map((point, idx) => (
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

              {(tracking || []).map((emp) => {
                if (!emp.currentLatitude || !emp.currentLongitude) return null;
                const isSelected = selectedEmployee === emp.id;
                return (
                  <Marker
                    key={emp.id}
                    position={[emp.currentLatitude, emp.currentLongitude]}
                    icon={isSelected ? SelectedIcon : DefaultIcon}
                    eventHandlers={{
                      click: () => handleEmployeeClick(emp),
                    }}
                  >
                    <Popup>
                      <div className="text-sm space-y-1.5 min-w-[180px]">
                        <div className="font-bold text-base">{emp.name}</div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getMarkerColor(emp) }} />
                          <span className="font-medium">{getStatusLabel(emp)}</span>
                        </div>
                        {emp.activeOrderId && (
                          <div className="text-xs border-t pt-1 mt-1">
                            <div>Order #{emp.activeOrderId}</div>
                            {emp.activeOrderCustomer && <div>Customer: {emp.activeOrderCustomer}</div>}
                          </div>
                        )}
                        {emp.lastSpeed !== null && (
                          <div className="text-xs">Speed: {getSpeedDisplay(emp.lastSpeed)}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          Updated: {getTimeAgo(emp.lastTrackingTime)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(tracking || []).map((emp) => {
          const isSelected = selectedEmployee === emp.id;
          const hasLocation = !!(emp.currentLatitude && emp.currentLongitude);
          const serviceIndicator = getServiceIndicator(emp);
          return (
            <Card
              key={emp.id}
              className={`border-0 shadow-sm cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
              onClick={() => handleEmployeeClick(emp)}
              data-testid={`card-employee-${emp.id}`}
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
                    {serviceIndicator && (
                      <Badge className={`text-[10px] h-4 ${serviceIndicator.color} border-0`} data-testid={`badge-service-indicator-${emp.id}`}>
                        {serviceIndicator.label}
                      </Badge>
                    )}
                    {emp.lastTrackingTime && (
                      <span className="text-[10px]">{getTimeAgo(emp.lastTrackingTime)}</span>
                    )}
                  </div>
                  {emp.serviceStartTime && emp.expectedDurationMinutes && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      Service: {emp.expectedDurationMinutes}min expected
                    </div>
                  )}
                  {!hasLocation && (
                    <div className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      No recent location available
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasLocation && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTrail(emp.id);
                      }}
                      data-testid={`button-view-trail-${emp.id}`}
                    >
                      {isSelected && showTrail ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedEmployee && selectedEmp && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {selectedEmp.name} - Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-muted/50 p-2.5 rounded-md">
                <div className="text-muted-foreground mb-1">Status</div>
                <div className="font-medium">{getStatusLabel(selectedEmp)}</div>
              </div>
              <div className="bg-muted/50 p-2.5 rounded-md">
                <div className="text-muted-foreground mb-1">Speed</div>
                <div className="font-medium">{getSpeedDisplay(selectedEmp.lastSpeed)}</div>
              </div>
              <div className="bg-muted/50 p-2.5 rounded-md">
                <div className="text-muted-foreground mb-1">Last Update</div>
                <div className="font-medium">{getTimeAgo(selectedEmp.lastTrackingTime)}</div>
              </div>
              <div className="bg-muted/50 p-2.5 rounded-md">
                <div className="text-muted-foreground mb-1">Order</div>
                <div className="font-medium">{selectedEmp.activeOrderId ? `#${selectedEmp.activeOrderId}` : "None"}</div>
              </div>
            </div>

            {selectedEmp.activeOrderCustomer && (
              <div className="mt-2 text-xs text-muted-foreground">
                Customer: {selectedEmp.activeOrderCustomer}
              </div>
            )}

            {selectedEmp.serviceStartTime && selectedEmp.expectedDurationMinutes && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md" data-testid="admin-service-timer-details">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium">Service In Progress</span>
                  </div>
                  {(() => {
                    const indicator = getServiceIndicator(selectedEmp);
                    return indicator ? (
                      <Badge className={`text-[10px] h-4 ${indicator.color} border-0`}>
                        {indicator.label}
                      </Badge>
                    ) : null;
                  })()}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Expected: </span>
                    <span className="font-medium">{selectedEmp.expectedDurationMinutes} min</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started: </span>
                    <span className="font-medium">{new Date(selectedEmp.serviceStartTime).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Elapsed: </span>
                    <span className="font-medium" data-testid="text-service-elapsed">{formatServiceElapsed(selectedEmp.serviceStartTime)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showTrail && selectedEmployee && trail && trail.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Movement Trail ({trail.length} points)
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {trail.slice(0, 20).map((point) => (
                <div key={point.id} className="flex items-center gap-2 text-xs border-b border-border/50 pb-1.5 flex-wrap">
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

      {showTrail && selectedEmployee && (!trail || trail.length === 0) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            No movement trail data available for this employee.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
