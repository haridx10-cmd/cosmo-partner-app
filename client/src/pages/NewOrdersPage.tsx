import { useOrders } from "@/hooks/use-orders";
import { format } from "date-fns";
import { Link } from "wouter";
import { Calendar, Clock, MapPin, ChevronRight, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ShiftToggle } from "@/components/ShiftToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function NewOrdersPage() {
  const { data: orders, isLoading, error } = useOrders({ status: "confirmed" });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Something went wrong</h3>
        <p className="text-gray-500 mt-2">Could not load your orders. Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-gradient-to-b from-purple-50/50 to-white">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Upcoming</h1>
          <p className="text-muted-foreground text-sm">Your scheduled appointments</p>
        </div>
        <ShiftToggle />
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
          <Calendar className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium">No upcoming orders</h3>
          <p className="text-sm">Enjoy your free time!</p>
        </div>
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {orders?.map((order) => (
            <motion.div key={order.id} variants={item}>
              <Link href={`/orders/${order.id}`} className="block group">
                <Card className="p-5 rounded-2xl border-transparent shadow-md shadow-purple-900/5 hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5 transition-all duration-300 bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground font-medium mb-1">
                        Order #{order.id}
                      </span>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
                        {order.customerName}
                      </h3>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2.5 text-primary/70" />
                      {format(new Date(order.appointmentTime), "EEE, MMM d • h:mm a")}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2.5 text-primary/70" />
                      {order.duration} mins • ${order.amount}
                    </div>
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2.5 mt-0.5 text-primary/70 shrink-0" />
                      <span className="line-clamp-1">{order.address}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">View Details</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
