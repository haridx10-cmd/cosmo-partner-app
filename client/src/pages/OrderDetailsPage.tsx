import { useOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useRoute } from "wouter";
import { Loader2, MapPin, Phone, User, Clock, Navigation, AlertTriangle, CheckCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { IssueModal } from "@/components/IssueModal";
import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

type OrderData = {
  mapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  phone?: string | null;
};

function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]destination=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/place\/[^/]*\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function isGoogleMapsUrl(url: string): boolean {
  return /google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url);
}

function openCustomerNavigation(order: OrderData, toast: (opts: any) => void) {
  if (order.mapsUrl && isGoogleMapsUrl(order.mapsUrl)) {
    window.open(order.mapsUrl, "_blank");
    return;
  }
  if (order.latitude && order.longitude) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`, "_blank");
    return;
  }
  if (order.address) {
    const encoded = encodeURIComponent(order.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
    return;
  }
  toast({
    title: "Location Unavailable",
    description: "Customer location information is not available for this order.",
    variant: "destructive",
  });
}

function callCustomer(phone: string | null | undefined, toast: (opts: any) => void) {
  if (!phone) {
    toast({
      title: "Phone Unavailable",
      description: "Customer phone number is not available.",
      variant: "destructive",
    });
    return;
  }
  const cleaned = phone.replace(/[^\d+]/g, "");
  window.open(`tel:${cleaned}`, "_self");
}

const geocodeCache = new Map<string, { lat: number; lng: number }>();

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(address)) return geocodeCache.get(address)!;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
      headers: { 'User-Agent': 'SalonAtHome/1.0' },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(address, result);
      return result;
    }
  } catch {}
  return null;
}

function MapPreview({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const position: [number, number] = [lat, lng];
  return (
    <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>{address}</Popup>
      </Marker>
    </MapContainer>
  );
}

export default function OrderDetailsPage() {
  const [, params] = useRoute("/orders/:id");
  const id = parseInt(params?.id || "0");
  const { data: order, isLoading, error } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const { toast } = useToast();

  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeAttempted, setGeocodeAttempted] = useState(false);

  const resolvedCoords = useMemo(() => {
    if (order?.latitude && order?.longitude) {
      return { lat: order.latitude, lng: order.longitude };
    }
    if (order?.mapsUrl) {
      const extracted = extractCoordsFromMapsUrl(order.mapsUrl);
      if (extracted) return extracted;
    }
    if (geocodedCoords) return geocodedCoords;
    return null;
  }, [order?.latitude, order?.longitude, order?.mapsUrl, geocodedCoords]);

  useEffect(() => {
    if (!order) return;
    if (order.latitude && order.longitude) return;
    if (order.mapsUrl) {
      const extracted = extractCoordsFromMapsUrl(order.mapsUrl);
      if (extracted) return;
    }
    if (order.address && !geocodeAttempted) {
      setGeocoding(true);
      setGeocodeAttempted(true);
      geocodeAddress(order.address).then((coords) => {
        if (coords) setGeocodedCoords(coords);
        setGeocoding(false);
      });
    }
  }, [order?.address, order?.latitude, order?.longitude, order?.mapsUrl, geocodeAttempted]);

  const handleNavigation = useCallback(() => {
    if (!order) return;
    openCustomerNavigation({
      mapsUrl: order.mapsUrl,
      latitude: resolvedCoords?.lat ?? order.latitude,
      longitude: resolvedCoords?.lng ?? order.longitude,
      address: order.address,
    }, toast);
  }, [order, resolvedCoords, toast]);

  const handleCall = useCallback(() => {
    if (!order) return;
    callCustomer(order.phone, toast);
  }, [order, toast]);

  if (isLoading) return <div className="h-screen flex items-center justify-center" data-testid="loading-spinner"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  if (error || !order) return <div className="h-screen flex items-center justify-center text-destructive" data-testid="error-message">Order not found</div>;

  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return (
          <Button 
            className="w-full h-12 text-lg font-semibold"
            onClick={() => updateStatus.mutate({ id, status: 'confirmed' })}
            disabled={updateStatus.isPending}
            data-testid="button-accept-order"
          >
            {updateStatus.isPending ? "Confirming..." : "Accept & Confirm"}
          </Button>
        );
      case 'confirmed':
        return (
          <div className="grid grid-cols-2 gap-3">
             <Button 
              className="h-12 font-semibold"
              onClick={() => updateStatus.mutate({ id, status: 'completed' })}
              data-testid="button-complete-order"
            >
              <CheckCircle className="w-5 h-5 mr-2" /> Complete Job
            </Button>
            <Button 
              variant="outline" 
              className="h-12"
              onClick={() => setIssueModalOpen(true)}
              data-testid="button-report-issue"
            >
              <AlertTriangle className="w-5 h-5 mr-2" /> Report Issue
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-24 pt-4 px-0 max-w-md mx-auto min-h-screen bg-background">
      <div className="px-5 mb-6">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
          <h1 className="text-2xl font-bold font-display" data-testid="text-order-id">Order #{order.id}</h1>
          <StatusBadge status={order.status} className="text-sm px-3 py-1" />
        </div>
        
        <div className="bg-muted/50 p-5 rounded-md border">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {order.customerName[0]}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-lg" data-testid="text-customer-name">{order.customerName}</h2>
              <button 
                onClick={handleCall}
                className="flex items-center text-muted-foreground text-sm mt-1 hover-elevate rounded-md px-1 -ml-1"
                data-testid="button-phone-inline"
              >
                <Phone className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span data-testid="text-phone">{order.phone || "No phone"}</span>
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground bg-background/60 p-3 rounded-md">
            <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <span className="text-sm leading-relaxed" data-testid="text-address">{order.address}</span>
          </div>
        </div>
      </div>

      <div className="h-48 w-full bg-muted mb-2 relative z-0" data-testid="map-preview">
        {resolvedCoords ? (
          <MapPreview lat={resolvedCoords.lat} lng={resolvedCoords.lng} address={order.address} />
        ) : geocoding ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading map...</span>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Map preview unavailable</span>
          </div>
        )}
      </div>

      <div className="px-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline"
            className="h-12 font-semibold"
            onClick={handleCall}
            disabled={!order.phone}
            data-testid="button-call-customer"
          >
            <PhoneCall className="w-5 h-5 mr-2" /> Call Customer
          </Button>
          <Button 
            className="h-12 font-semibold"
            onClick={handleNavigation}
            data-testid="button-start-navigation"
          >
            <Navigation className="w-5 h-5 mr-2" /> Navigate
          </Button>
        </div>
      </div>

      <div className="px-5 space-y-6">
        <div>
          <h3 className="text-lg font-bold font-display mb-3">Services</h3>
          <div className="space-y-3">
            {(order.services as Array<{name: string, price: number}>)?.map((service, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 border-b last:border-0" data-testid={`row-service-${idx}`}>
                <span className="font-medium">{service.name}</span>
                <span className="font-bold">{service.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center flex-wrap gap-2 text-lg">
            <span className="font-bold text-muted-foreground">Total</span>
            <span className="font-bold text-primary text-xl" data-testid="text-total-amount">{order.amount}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-md text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="font-semibold" data-testid="text-duration">{order.duration} min</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          <div className="bg-muted/50 p-4 rounded-md text-center">
            <div className="font-semibold capitalize mt-8" data-testid="text-payment-mode">{order.paymentMode}</div>
            <div className="text-xs text-muted-foreground">Payment</div>
          </div>
        </div>

        <div className="pt-4 pb-8">
           {getNextAction()}
        </div>
      </div>

      <IssueModal 
        orderId={order.id} 
        open={issueModalOpen} 
        onOpenChange={setIssueModalOpen} 
      />
    </div>
  );
}
