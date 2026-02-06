import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { AlertTriangle } from "lucide-react";

const INTERVAL_TRAVELING = 15000;
const INTERVAL_AT_LOCATION = 60000;
const INTERVAL_IDLE = 60000;
const SPEED_THRESHOLD_MS = 0.556; // 2 km/h in m/s

type TrackingState = "traveling" | "at_location" | "idle" | "off";

type ServiceSession = {
  id: number;
  orderId: number;
  beauticianId: number;
  serviceStartTime: string;
  expectedDurationMinutes: number;
  serviceEndTime: string | null;
  status: string;
};

export function LocationTracker() {
  const { user } = useAuth();
  const { data: orders } = useOrders();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoordsRef = useRef<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
  } | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [trackingState, setTrackingState] = useState<TrackingState>("off");
  const pendingUpdatesRef = useRef<Array<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    orderId: number | null;
    trackingStatus: string;
    timestamp: number;
  }>>([]);

  const activeOrder = orders?.find(
    (o) => o.status === "confirmed" || o.status === "in_progress"
  );

  const { data: activeSession } = useQuery<ServiceSession | null>({
    queryKey: ['/api/service/beautician'],
    queryFn: async () => {
      const res = await fetch(api.service.activeForBeautician.path, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!(user && user.role === "employee" && user.isOnline),
    refetchInterval: 30000,
  });

  const shouldTrack = !!(
    user &&
    user.role === "employee" &&
    (user.isOnline || activeOrder)
  );

  const getInterval = useCallback(
    (speed: number | null): number => {
      if (activeSession) return INTERVAL_AT_LOCATION;
      if (!activeOrder) return INTERVAL_IDLE;
      if (speed !== null && speed > SPEED_THRESHOLD_MS) return INTERVAL_TRAVELING;
      return INTERVAL_AT_LOCATION;
    },
    [activeOrder, activeSession]
  );

  const getStatus = useCallback(
    (speed: number | null): TrackingState => {
      if (activeSession) return "at_location";
      if (!activeOrder) return "idle";
      if (speed !== null && speed > SPEED_THRESHOLD_MS) return "traveling";
      return "at_location";
    },
    [activeOrder, activeSession]
  );

  const sendUpdate = useCallback(async () => {
    if (!lastCoordsRef.current) return;
    const coords = lastCoordsRef.current;
    const status = getStatus(coords.speed);
    setTrackingState(status);

    const payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      speed: coords.speed,
      orderId: activeSession?.orderId ?? activeOrder?.id ?? null,
      trackingStatus: status,
    };

    try {
      const res = await fetch(api.employee.updateLocation.path, {
        method: api.employee.updateLocation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (res.ok && pendingUpdatesRef.current.length > 0) {
        for (const pending of pendingUpdatesRef.current) {
          try {
            await fetch(api.employee.updateLocation.path, {
              method: api.employee.updateLocation.method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(pending),
              credentials: "include",
            });
          } catch {}
        }
        pendingUpdatesRef.current = [];
      }
    } catch (err) {
      console.warn("Failed to send location update:", err);
      pendingUpdatesRef.current.push({
        ...payload,
        timestamp: Date.now(),
      });
      if (pendingUpdatesRef.current.length > 50) {
        pendingUpdatesRef.current = pendingUpdatesRef.current.slice(-50);
      }
    }
  }, [activeOrder?.id, activeSession?.orderId, getStatus]);

  useEffect(() => {
    if (!shouldTrack) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTrackingState("off");
      setGpsError(false);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError(true);
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGpsError(false);
        lastCoordsRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          speed: position.coords.speed ?? null,
        };
      },
      (error) => {
        console.warn("GPS error:", error.message);
        setGpsError(true);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    sendUpdate();

    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const speed = lastCoordsRef.current?.speed ?? null;
      const ms = getInterval(speed);
      intervalRef.current = setInterval(() => {
        sendUpdate();
        const newSpeed = lastCoordsRef.current?.speed ?? null;
        const newMs = getInterval(newSpeed);
        if (newMs !== ms) {
          startInterval();
        }
      }, ms);
    };

    startInterval();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldTrack, sendUpdate, getInterval]);

  if (gpsError && shouldTrack) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-2 rounded-md bg-destructive p-3 text-destructive-foreground shadow-lg"
        data-testid="banner-gps-error"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">Location tracking unavailable</span>
      </div>
    );
  }

  return null;
}

export function useTrackingState() {
  return { trackingState: "idle" as TrackingState };
}
