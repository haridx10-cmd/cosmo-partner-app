import { useAuth } from "@/hooks/use-auth";
import { User, LogOut, Settings, HelpCircle, FileText, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <div className="pb-24 pt-10 px-4 max-w-md mx-auto min-h-screen bg-white">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-110" />
          <Avatar className="w-24 h-24 border-4 border-white shadow-xl relative z-10">
            <AvatarImage src={user?.profileImageUrl} />
            <AvatarFallback className="bg-primary text-white text-2xl">
              {user?.firstName?.[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <h2 className="text-2xl font-bold font-display text-gray-900">
          {user?.firstName} {user?.lastName}
        </h2>
        <p className="text-muted-foreground">Senior Stylist</p>
      </div>

      {/* Menu List */}
      <div className="space-y-2 mb-8">
        {menuItems.map((item, index) => (
          <button 
            key={index}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-gray-700">{item.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <Button 
        variant="destructive" 
        className="w-full h-12 rounded-xl text-base font-medium shadow-lg shadow-red-100"
        onClick={() => logout()}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Log Out
      </Button>
      
      <p className="text-center text-xs text-gray-300 mt-8">Version 1.0.0</p>
    </div>
  );
}
