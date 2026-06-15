import { useAuth } from "@/hooks/use-auth";
import { LogOut, CalendarCheck, MessageCircle, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function MenuPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

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
        <p className="text-xs text-primary font-medium mt-1">Beautician</p>
      </div>

      <div className="space-y-3 mb-6">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => navigate("/chat")}
        >
          <MessageCircle className="w-4 h-4 text-primary" />
          Chat with Admin
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => navigate("/attendance")}
        >
          <CalendarCheck className="w-4 h-4 text-primary" />
          My Attendance
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={() => navigate("/auto-balance")}
        >
          <Wallet className="w-4 h-4 text-primary" />
          My Auto Balance
        </Button>
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
