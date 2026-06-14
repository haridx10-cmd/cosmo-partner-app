import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isFuture,
  parseISO,
} from "date-fns";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: "present" | "absent" | "week_off" | "half_day";
  markedBy: number | null;
}

const STATUS_CONFIG = {
  present:  { label: "P",  color: "bg-green-500 text-white",  ring: "ring-green-400",  text: "Present"  },
  absent:   { label: "A",  color: "bg-red-400 text-white",    ring: "ring-red-400",    text: "Absent"   },
  week_off: { label: "WO", color: "bg-blue-400 text-white",   ring: "ring-blue-400",   text: "Week Off" },
  half_day: { label: "H",  color: "bg-yellow-400 text-white", ring: "ring-yellow-400", text: "Half Day (admin)" },
};

// Cycle order for self-marking (tap to cycle)
const SELF_CYCLE: Record<string, string> = {
  "":         "present",
  "present":  "absent",
  "absent":   "week_off",  // will be skipped on Fri/Sat/Sun
  "week_off": "present",
};
const SELF_CYCLE_WEEKEND: Record<string, string> = {
  "":        "present",
  "present": "absent",
  "absent":  "present",
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [current, setCurrent] = useState(new Date());

  const year  = current.getFullYear();
  const month = current.getMonth() + 1;

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/me", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/me?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const markMutation = useMutation({
    mutationFn: async ({ date, status }: { date: string; status: string }) => {
      const res = await fetch("/api/attendance/self-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to mark");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/attendance/me", year, month] });
    },
    onError: (err: any) => {
      toast({ title: "Cannot mark attendance", description: err.message, variant: "destructive" });
    },
  });

  const recordMap = new Map<string, AttendanceRecord>(
    records.map((r) => [r.date.slice(0, 10), r])
  );

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const firstDayOfWeek = getDay(startOfMonth(current)); // 0=Sun
  const leadingBlanks  = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // ── Leave deduction logic ──────────────────────────────────────────────────
  const isFriSunDay = (dateStr: string) => {
    const d = new Date(dateStr).getDay();
    return d === 0 || d === 5 || d === 6;
  };

  const totalPresent  = records.filter((r) => r.status === "present").length;
  const totalAbsent   = records.filter((r) => r.status === "absent").length;
  const totalHalfDay  = records.filter((r) => r.status === "half_day").length;
  const totalWeekOff  = records.filter((r) => r.status === "week_off").length;

  const totalLeaveDeducted = records.reduce((sum, r) => {
    const weekend = isFriSunDay(r.date);
    if (r.status === "absent")   return sum + (weekend ? 2 : 1);
    if (r.status === "half_day") return sum + (weekend ? 1 : 0.5);
    return sum;
  }, 0);

  const handleTap = (day: Date, record: AttendanceRecord | undefined) => {
    if (isFuture(day) && !isToday(day)) return; // future: skip
    if (record?.status === "half_day") {
      toast({ description: "Half-day is set by admin. Contact admin to change.", variant: "destructive" });
      return;
    }
    const key       = format(day, "yyyy-MM-dd");
    const dayNum    = getDay(day);
    const isWeekend = dayNum === 0 || dayNum === 5 || dayNum === 6;
    const current   = record?.status ?? "";
    const cycle     = isWeekend ? SELF_CYCLE_WEEKEND : SELF_CYCLE;
    const next      = cycle[current] ?? "present";
    markMutation.mutate({ date: key, status: next });
  };

  const nowMonth = new Date();
  const isCurrentMonth = year === nowMonth.getFullYear() && month === nowMonth.getMonth() + 1;

  return (
    <div className="pb-28 min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">My Attendance</h1>
          <p className="text-xs text-muted-foreground">{user?.name}</p>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-md mx-auto space-y-4">

        {/* Hint */}
        <div className="flex items-start gap-2 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-xs">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Tap a date to mark yourself. Cycle: <b>→ Present → Absent{" "}→ Week Off (Mon–Thu)</b>. Half-day can only be set by admin.</span>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setCurrent(new Date(year, month - 2, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-lg">{format(current, "MMMM yyyy")}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent(new Date(year, month, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full ${cfg.color} flex items-center justify-center text-[9px] font-bold`}>
                {cfg.label}
              </div>
              <span className="text-muted-foreground">{cfg.text}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`b-${i}`} className="h-14 border-b border-r" />
              ))}

              {days.map((day) => {
                const key     = format(day, "yyyy-MM-dd");
                const record  = recordMap.get(key);
                const cfg     = record ? STATUS_CONFIG[record.status] : null;
                const today   = isToday(day);
                const future  = isFuture(day) && !today;
                const dayNum  = getDay(day);
                const weekend = dayNum === 5 || dayNum === 6 || dayNum === 0;
                const adminSet = record?.markedBy !== null && record?.markedBy !== undefined;

                return (
                  <div
                    key={key}
                    onClick={() => !future && handleTap(day, record)}
                    className={[
                      "h-14 flex flex-col items-center justify-center border-b border-r select-none transition-colors",
                      today   ? "bg-primary/5"  : "",
                      weekend ? "bg-orange-50/40" : "",
                      future  ? "opacity-35"    : "cursor-pointer active:bg-gray-100",
                    ].join(" ")}
                  >
                    <span className={`text-xs font-medium mb-1 ${today ? "text-primary font-bold" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </span>
                    {cfg ? (
                      <div className={`w-7 h-5 rounded text-[9px] font-bold flex items-center justify-center ${cfg.color} ${adminSet ? "ring-1 ring-offset-0 " + cfg.ring : ""}`}>
                        {cfg.label}
                      </div>
                    ) : (
                      <div className="w-7 h-5 rounded border border-dashed border-gray-200" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{totalPresent}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Days Present</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-500">{totalAbsent}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Days Absent</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{totalHalfDay}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Half Days</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-red-50 border-red-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-700">{totalLeaveDeducted.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Leave Deducted</div>
            </CardContent>
          </Card>
        </div>

        {/* Rules */}
        <div className="bg-gray-100 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-gray-700">Leave deduction rules</p>
          <p>Mon–Thu: Absent = 1 day · Half Day = 0.5 day · Week Off = 0</p>
          <p>Fri–Sun: Absent = 2 days · Half Day = 1 day · Week Off not allowed</p>
          <p className="mt-1">Ring border = marked by admin. Half-day can only be changed by admin.</p>
        </div>

      </div>
    </div>
  );
}
