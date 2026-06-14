import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: "present" | "absent" | "week_off" | "half_day";
}

const STATUS_CONFIG = {
  present: { label: "P", color: "bg-green-500 text-white", text: "Present" },
  absent: { label: "A", color: "bg-red-400 text-white", text: "Absent" },
  week_off: { label: "WO", color: "bg-blue-400 text-white", text: "Week Off" },
  half_day: { label: "H", color: "bg-yellow-400 text-white", text: "Half Day" },
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(new Date());

  const year = current.getFullYear();
  const month = current.getMonth() + 1;

  const { data: records = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance/me", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/me?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const recordMap = new Map<string, AttendanceRecord>(
    records.map((r) => [r.date.slice(0, 10), r])
  );

  const days = eachDayOfInterval({
    start: startOfMonth(current),
    end: endOfMonth(current),
  });

  // Leading empty cells (Mon=1 as first column; Sun=0→7)
  const firstDayOfWeek = getDay(startOfMonth(current)); // 0=Sun
  const leadingBlanks = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Stats
  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalHalfDay = records.filter((r) => r.status === "half_day").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const totalWeekOff = records.filter((r) => r.status === "week_off").length;

  /**
   * Leave deduction rules:
   *  Mon–Thu:
   *    Absent   → 1 day leave
   *    Half Day → 0.5 day leave
   *    Week Off → 0 (entitled off)
   *  Fri–Sun (each calendar day = 2 working days):
   *    Absent   → 2 days leave
   *    Half Day → 1 day leave
   *    Week Off → NOT allowed (blocked at admin level too)
   */
  const isFriSunDay = (dateStr: string) => {
    const d = new Date(dateStr).getDay(); // 0=Sun,5=Fri,6=Sat
    return d === 0 || d === 5 || d === 6;
  };

  const totalLeaveDeducted = records.reduce((sum, r) => {
    const weekend = isFriSunDay(r.date);
    if (r.status === "absent")   return sum + (weekend ? 2 : 1);
    if (r.status === "half_day") return sum + (weekend ? 1 : 0.5);
    return sum; // present / week_off → 0
  }, 0);

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">Attendance</h1>
          <p className="text-xs text-muted-foreground">{user?.name}</p>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-md mx-auto space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent(new Date(year, month - 2, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-lg">{format(current, "MMMM yyyy")}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent(new Date(year, month, 1))}
            disabled={isSameMonth(current, new Date())}
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {/* Leading blanks */}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} className="h-12" />
            ))}

            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const record = recordMap.get(key);
              const cfg = record ? STATUS_CONFIG[record.status] : null;
              const today = isToday(day);
              const dayNum = getDay(day); // 0=Sun
              const isFriSun = dayNum === 5 || dayNum === 6 || dayNum === 0;

              return (
                <div
                  key={key}
                  className={`h-12 flex flex-col items-center justify-center border-b border-r last:border-r-0 ${today ? "bg-primary/5" : ""} ${isFriSun ? "bg-gray-50" : ""}`}
                >
                  <span className={`text-xs font-medium mb-0.5 ${today ? "text-primary font-bold" : "text-gray-700"}`}>
                    {format(day, "d")}
                  </span>
                  {cfg ? (
                    <div className={`w-6 h-4 rounded text-[9px] font-bold flex items-center justify-center ${cfg.color}`}>
                      {cfg.label}
                    </div>
                  ) : (
                    <div className="w-6 h-4" />
                  )}
                </div>
              );
            })}
          </div>
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

          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-700">{totalLeaveDeducted.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Leave Deducted</div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                Fri–Sun absent=2d, half=1d<br />Mon–Thu absent=1d, half=0.5d
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gray-100 rounded-lg p-3 text-xs text-muted-foreground space-y-1 pb-2">
          <p className="font-semibold text-gray-700">Leave deduction rules</p>
          <p>Mon–Thu: Absent = 1 day · Half Day = 0.5 day · Week Off = 0</p>
          <p>Fri–Sun: Absent = 2 days · Half Day = 1 day · Week Off not allowed</p>
          <p className="mt-1 italic">Attendance is marked by admin. Contact admin for corrections.</p>
        </div>
      </div>
    </div>
  );
}
