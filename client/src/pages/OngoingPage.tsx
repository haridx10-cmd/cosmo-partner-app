import { useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { Link } from "wouter";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Clock, MapPin } from "lucide-react";

function parseAppointmentWallTime(value: string | Date) {
  if (value instanceof Date) return value;
  const isoMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (isoMatch) {
    const [, y, m, d, hh, mm, ss] = isoMatch;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss || "0")
    );
  }
  return new Date(value);
}

export default function OngoingPage() {
  const [activeTab, setActiveTab] = useState("today");
  const { data: orders } = useOrders();

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startDayAfterTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const allOrders = orders || [];

  const todayOrders = allOrders.filter((order) => {
    const appt = parseAppointmentWallTime(order.appointmentTime);
    return appt >= startToday && appt < startTomorrow;
  });

  const tomorrowOrders = allOrders.filter((order) => {
    const appt = parseAppointmentWallTime(order.appointmentTime);
    return appt >= startTomorrow && appt < startDayAfterTomorrow;
  });

  const upcomingOrders = [...allOrders].sort(
    (a, b) =>
      parseAppointmentWallTime(b.appointmentTime).getTime() -
      parseAppointmentWallTime(a.appointmentTime).getTime()
  );

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold font-display text-gray-900 mb-6">Schedule</h1>
      
      <Tabs defaultValue="today" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-white p-1 rounded-xl shadow-sm">
          <TabsTrigger value="today" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Today</TabsTrigger>
          <TabsTrigger value="tomorrow" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Tomorrow</TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="text-sm text-muted-foreground font-medium mb-2 uppercase tracking-wider pl-1">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          
          {todayOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No orders for today</div>
          ) : (
            todayOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="p-4 rounded-xl border-none shadow-sm hover:shadow-md transition-all bg-white mb-3 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {format(parseAppointmentWallTime(order.appointmentTime), "h:mm a")}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      <span className="truncate max-w-[120px]">{order.address}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="tomorrow">
          {tomorrowOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No orders for tomorrow</div>
          ) : (
            tomorrowOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="p-4 rounded-xl border-none shadow-sm hover:shadow-md transition-all bg-white mb-3 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {format(parseAppointmentWallTime(order.appointmentTime), "h:mm a")}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      <span className="truncate max-w-[120px]">{order.address}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming">
          {upcomingOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No orders found</div>
          ) : (
            upcomingOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="p-4 rounded-xl border-none shadow-sm hover:shadow-md transition-all bg-white mb-3 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {format(parseAppointmentWallTime(order.appointmentTime), "MMM d, h:mm a")}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5" />
                      <span className="truncate max-w-[120px]">{order.address}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
