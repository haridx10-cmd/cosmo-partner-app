import { useState } from "react";
import { useOrders } from "@/hooks/use-orders";
import { Link } from "wouter";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Clock, MapPin } from "lucide-react";

export default function OngoingPage() {
  const [activeTab, setActiveTab] = useState("today");
  // In a real app, calculate today's date string for filter
  const today = new Date().toISOString().split('T')[0];
  
  const { data: orders } = useOrders({ date: today });

  // Mock filtering for demo purposes since API might return all
  const filteredOrders = orders || []; // Replace with actual logic

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold font-display text-gray-900 mb-6">Schedule</h1>
      
      <Tabs defaultValue="today" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-white p-1 rounded-xl shadow-sm">
          <TabsTrigger value="today" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Today</TabsTrigger>
          <TabsTrigger value="tomorrow" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Tomorrow</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="text-sm text-muted-foreground font-medium mb-2 uppercase tracking-wider pl-1">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No orders for today</div>
          ) : (
            filteredOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="p-4 rounded-xl border-none shadow-sm hover:shadow-md transition-all bg-white mb-3 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {format(new Date(order.appointmentTime), "h:mm a")}
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
          <div className="text-center py-20 text-muted-foreground bg-white rounded-2xl border border-dashed">
            Upcoming schedule will appear here
          </div>
        </TabsContent>
        
        <TabsContent value="completed">
          <div className="text-center py-20 text-muted-foreground bg-white rounded-2xl border border-dashed">
             No past orders found
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
