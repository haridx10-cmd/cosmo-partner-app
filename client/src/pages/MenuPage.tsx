import { useAuth } from "@/hooks/use-auth";
import { User, LogOut, Settings, HelpCircle, FileText, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function MenuPage() {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: User, label: "Profile Settings", href: "#" },
    { icon: FileText, label: "Service History", href: "#" },
    { icon: Settings, label: "App Preferences", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  return (
    <div className="pb-24 pt-10 px-4 max-w-md mx-auto min-h-screen bg-white" data-testid="menu-page">
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-4">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-primary text-white text-2xl font-bold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white ${user?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
        <h2 className="text-xl font-bold font-display text-gray-900">{user?.name || "User"}</h2>
        <p className="text-muted-foreground text-sm">{user?.mobile || user?.username || user?.email}</p>
        <p className="text-xs text-primary font-medium mt-1 capitalize">{user?.role}</p>
      </div>

      <div className="space-y-1 mb-8">
        {menuItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-gray-700 transition-colors"
          >
            <Icon className="w-5 h-5 text-gray-400" />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600"
        onClick={() => logout()}
        data-testid="button-logout"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
