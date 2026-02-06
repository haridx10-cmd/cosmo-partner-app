import { useEffect, useRef } from "react";
import { useUpdateLocation } from "@/hooks/use-beautician";
import { useAuth } from "@/hooks/use-auth";

const GPS_INTERVAL_MS = 10000;

export function LocationTracker() {
  const { user } = useAuth();
  const updateLocation = useUpdateLocation();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!user || user.role !== "employee" || !user.isOnline) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastCoordsRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      },
      (error) => {
        console.warn("GPS error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    intervalRef.current = setInterval(() => {
      if (lastCoordsRef.current) {
        updateLocation.mutate(lastCoordsRef.current);
      }
    }, GPS_INTERVAL_MS);

    if (lastCoordsRef.current) {
      updateLocation.mutate(lastCoordsRef.current);
    }

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
  }, [user?.isOnline, user?.role]);

  return null;
}
