import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, AlertTriangle, MapPin, Users, LogOut } from "lucide-react";
import OverviewPanel from "./OverviewPanel";
import SmoothOrdersPanel from "./SmoothOrdersPanel";
import IssuesPanel from "./IssuesPanel";
import TrackingPanel from "./TrackingPanel";
import EmployeesPanel from "./EmployeesPanel";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

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
          <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-admin-logout">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap gap-1 bg-white border h-auto p-1">
            <TabsTrigger value="overview" className="flex-1 min-w-[80px] gap-1 text-xs sm:text-sm" data-testid="tab-overview">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 min-w-[80px] gap-1 text-xs sm:text-sm" data-testid="tab-orders">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex-1 min-w-[80px] gap-1 text-xs sm:text-sm" data-testid="tab-issues">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Issues</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex-1 min-w-[80px] gap-1 text-xs sm:text-sm" data-testid="tab-tracking">
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex-1 min-w-[80px] gap-1 text-xs sm:text-sm" data-testid="tab-employees">
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewPanel /></TabsContent>
          <TabsContent value="orders"><SmoothOrdersPanel /></TabsContent>
          <TabsContent value="issues"><IssuesPanel /></TabsContent>
          <TabsContent value="tracking"><TrackingPanel /></TabsContent>
          <TabsContent value="employees"><EmployeesPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
