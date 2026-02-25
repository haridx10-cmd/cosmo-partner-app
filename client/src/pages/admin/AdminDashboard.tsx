import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutDashboard, ShoppingBag, AlertTriangle, MapPin, Users, LogOut, CalendarIcon, Route, Scissors, Boxes } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import OverviewPanel from "./OverviewPanel";
import SmoothOrdersPanel from "./SmoothOrdersPanel";
import IssuesPanel from "./IssuesPanel";
import TrackingPanel from "./TrackingPanel";
import EmployeesPanel from "./EmployeesPanel";
import BeauticiansPanel from "./BeauticiansPanel";
import RoutingPanel from "./RoutingPanel";
import AdminInventoryPanel from "./AdminInventoryPanel";
import ProductRequestsPanel from "./ProductRequestsPanel";
import CancellationsPanel from "./CancellationsPanel";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) return;
    setDateRange({ from: startOfDay(day), to: endOfDay(day) });
    setCalendarOpen(false);
  };

  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range?.from) return;
    setDateRange({
      from: startOfDay(range.from),
      to: endOfDay(range.to || range.from),
    });
    if (range.to) setCalendarOpen(false);
  };

  const dateLabel = dateRange.from.toDateString() === dateRange.to.toDateString()
    ? format(dateRange.from, "MMM d, yyyy")
    : `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;

  const isToday = startOfDay(new Date()).getTime() === startOfDay(dateRange.from).getTime()
    && startOfDay(new Date()).getTime() === startOfDay(dateRange.to).getTime();

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display text-gray-900">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" data-testid="button-date-filter">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{dateLabel}</span>
                  <span className="sm:hidden">{isToday ? "Today" : format(dateRange.from, "MMM d")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b flex gap-1 flex-wrap">
                  <Button
                    variant={isToday ? "default" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setDateRange({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
                      setCalendarOpen(false);
                    }}
                    data-testid="button-date-today"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
                      setCalendarOpen(false);
                    }}
                    data-testid="button-date-yesterday"
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      setDateRange({ from: startOfDay(weekAgo), to: endOfDay(new Date()) });
                      setCalendarOpen(false);
                    }}
                    data-testid="button-date-week"
                  >
                    Last 7 days
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-admin-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap gap-1 bg-white border h-auto p-1">
            <TabsTrigger value="overview" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-overview">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-orders">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-issues">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Issues</span>
            </TabsTrigger>
            <TabsTrigger value="beauticians" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-beauticians">
              <Scissors className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Beauticians</span>
            </TabsTrigger>
            <TabsTrigger value="routing" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-routing">
              <Route className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Routing</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-tracking">
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-employees">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-inventory">
              <Boxes className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="product-requests" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-product-requests">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Product Requests</span>
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="flex-1 min-w-[60px] gap-1 text-xs sm:text-sm" data-testid="tab-cancellations">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancellations</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewPanel dateRange={dateRange} onTabChange={setActiveTab} />
          </TabsContent>
          <TabsContent value="orders">
            <SmoothOrdersPanel dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="issues">
            <IssuesPanel dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="beauticians">
            <BeauticiansPanel dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="routing">
            <RoutingPanel dateRange={dateRange} />
          </TabsContent>
          <TabsContent value="tracking"><TrackingPanel /></TabsContent>
          <TabsContent value="employees"><EmployeesPanel /></TabsContent>
          <TabsContent value="inventory"><AdminInventoryPanel /></TabsContent>
          <TabsContent value="product-requests"><ProductRequestsPanel /></TabsContent>
          <TabsContent value="cancellations"><CancellationsPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
