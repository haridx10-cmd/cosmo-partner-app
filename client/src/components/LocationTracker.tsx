import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { api } from "@shared/routes";
import { AlertTriangle } from "lucide-react";

const INTERVAL_TRAVELING = 15000;
const INTERVAL_AT_LOCATION = 60000;
const INTERVAL_IDLE = 60000;
const SPEED_THRESHOLD_MS = 0.556; // 2 km/h in m/s

type TrackingState = "traveling" | "at_location" | "idle" | "off";

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

  const activeOrder = orders?.find(
    (o) => o.status === "confirmed" || o.status === "in_progress"
  );

  const shouldTrack = !!(
    user &&
    user.role === "employee" &&
    user.isOnline
  );

  const getInterval = useCallback(
    (speed: number | null): number => {
      if (!activeOrder) return INTERVAL_IDLE;
      if (speed !== null && speed > SPEED_THRESHOLD_MS) return INTERVAL_TRAVELING;
      return INTERVAL_AT_LOCATION;
    },
    [activeOrder]
  );

  const getStatus = useCallback(
    (speed: number | null): TrackingState => {
      if (!activeOrder) return "idle";
      if (speed !== null && speed > SPEED_THRESHOLD_MS) return "traveling";
      return "at_location";
    },
    [activeOrder]
  );

  const sendUpdate = useCallback(async () => {
    if (!lastCoordsRef.current) return;
    const coords = lastCoordsRef.current;
    const status = getStatus(coords.speed);
    setTrackingState(status);

    try {
      await fetch(api.employee.updateLocation.path, {
        method: api.employee.updateLocation.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed,
          orderId: activeOrder?.id ?? null,
          trackingStatus: status,
        }),
        credentials: "include",
      });
    } catch (err) {
      console.warn("Failed to send location update:", err);
    }
  }, [activeOrder?.id, getStatus]);

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
