import { useOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useRoute } from "wouter";
import { Loader2, MapPin, Phone, User, Clock, Navigation, Car, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { IssueModal } from "@/components/IssueModal";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function OrderDetailsPage() {
  const [, params] = useRoute("/orders/:id");
  const id = parseInt(params?.id || "0");
  const { data: order, isLoading, error } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  if (error || !order) return <div className="h-screen flex items-center justify-center text-red-500">Order not found</div>;

  // Safe coordinates or default to NY
  const position: [number, number] = [order.latitude || 40.7128, order.longitude || -74.0060];

  const handleNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`, '_blank');
  };

  const handleUber = () => {
    // Basic Uber deep link (might need client ID in real app)
    window.open(`https://m.uber.com/ul/?action=setPickup&client_id=YOUR_CLIENT_ID&pickup=my_location&dropoff[latitude]=${position[0]}&dropoff[longitude]=${position[1]}`, '_blank');
  };

  const getNextAction = () => {
    switch (order.status) {
      case 'pending':
        return (
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg font-semibold shadow-lg shadow-purple-200"
            onClick={() => updateStatus.mutate({ id, status: 'confirmed' })}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? "Confirming..." : "Accept & Confirm"}
          </Button>
        );
      case 'confirmed':
        return (
          <div className="grid grid-cols-2 gap-3">
             <Button 
              className="bg-green-600 hover:bg-green-700 h-12 font-semibold shadow-lg shadow-green-200"
              onClick={() => updateStatus.mutate({ id, status: 'completed' })}
            >
              <CheckCircle className="w-5 h-5 mr-2" /> Complete Job
            </Button>
            <Button 
              variant="outline" 
              className="h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              onClick={() => setIssueModalOpen(true)}
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
    <div className="pb-24 pt-4 px-0 max-w-md mx-auto min-h-screen bg-white">
      {/* Header */}
      <div className="px-5 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold font-display">Order #{order.id}</h1>
          <StatusBadge status={order.status} className="text-sm px-3 py-1" />
        </div>
        
        {/* Customer Card */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
              {order.customerName[0]}
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">{order.customerName}</h2>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Phone className="w-3.5 h-3.5 mr-1" />
                {order.phone}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 text-gray-600 bg-white/60 p-3 rounded-lg">
            <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <span className="text-sm leading-relaxed">{order.address}</span>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="h-48 w-full bg-gray-100 mb-6 relative z-0">
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position}>
            <Popup>{order.address}</Popup>
          </Marker>
        </MapContainer>
        <div className="absolute bottom-4 right-4 flex gap-2 z-[400]">
           <Button size="icon" className="rounded-full shadow-lg bg-white text-gray-800 hover:bg-gray-50" onClick={handleNavigation}>
             <Navigation className="w-5 h-5 text-blue-600" />
           </Button>
           <Button size="icon" className="rounded-full shadow-lg bg-black text-white hover:bg-gray-800" onClick={handleUber}>
             <Car className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* Services List */}
      <div className="px-5 space-y-6">
        <div>
          <h3 className="text-lg font-bold font-display mb-3">Services</h3>
          <div className="space-y-3">
            {(order.services as Array<{name: string, price: number}>)?.map((service, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                <span className="font-medium text-gray-700">{service.name}</span>
                <span className="font-bold text-gray-900">${service.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center text-lg">
            <span className="font-bold text-gray-500">Total</span>
            <span className="font-bold text-primary text-xl">${order.amount}</span>
          </div>
        </div>

        {/* Duration & Payment */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <div className="font-semibold text-gray-900">{order.duration} min</div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <div className="font-semibold text-gray-900 capitalize mt-8">{order.paymentMode}</div>
            <div className="text-xs text-gray-500">Payment</div>
          </div>
        </div>

        {/* Action Buttons */}
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
