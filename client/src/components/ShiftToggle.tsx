import { useBeautician, useToggleShift } from "@/hooks/use-beautician";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function ShiftToggle() {
  const { data: beautician, isLoading } = useBeautician();
  const toggleMutation = useToggleShift();

  if (isLoading || !beautician) return null;

  const isOnline = beautician.isOnline;

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate(checked ? 'start_shift' : 'end_shift');
  };

  return (
    <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-border/50">
      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
      <Label htmlFor="shift-mode" className="text-sm font-medium cursor-pointer">
        {isOnline ? "Online" : "Offline"}
      </Label>
      <div className="relative">
        <Switch 
          id="shift-mode" 
          checked={isOnline}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
          className="data-[state=checked]:bg-green-500"
        />
        {toggleMutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
