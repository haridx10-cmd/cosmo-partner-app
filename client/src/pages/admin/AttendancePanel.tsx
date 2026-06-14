import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: number;
  name: string;
  role: string;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: "present" | "absent" | "week_off" | "half_day";
  markedBy: number | null;
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present", color: "bg-green-500" },
  { value: "half_day", label: "Half Day", color: "bg-yellow-400" },
  { value: "absent", label: "Absent", color: "bg-red-400" },
  { value: "week_off", label: "Week Off", color: "bg-blue-400" },
];

const STATUS_DISPLAY: Record<string, { label: string; color: string; dot: string }> = {
  present: { label: "P", color: "bg-green-500 text-white", dot: "bg-green-500" },
  absent: { label: "A", color: "bg-red-400 text-white", dot: "bg-red-400" },
  week_off: { label: "WO", color: "bg-blue-400 text-white", dot: "bg-blue-400" },
  half_day: { label: "H", color: "bg-yellow-400 text-white", dot: "bg-yellow-400" },
};

export default function AttendancePanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(new Date());
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth() + 1;

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/admin/employees"],
    queryFn: async () => {
      const res = await fetch("/api/admin/employees");
      return res.json();
    },
  });

  const nonAdmins = employees.filter((e) => e.role !== "admin");

  const { data: records = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/admin/attendance", selectedEmpId, year, month],
    queryFn: async () => {
      if (!selectedEmpId) return [];
      const res = await fetch(`/api/admin/attendance/${selectedEmpId}?year=${year}&month=${month}`);
      return res.json();
    },
    enabled: !!selectedEmpId,
  });

  const recordMap = new Map<string, AttendanceRecord>(
    records.map((r) => [r.date.slice(0, 10), r])
  );

  const markMutation = useMutation({
    mutationFn: async ({ date, status }: { date: string; status: string }) => {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmpId, date, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to mark");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/attendance", selectedEmpId, year, month] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });
  const firstDayOfWeek = getDay(startOfMonth(current));
  const leadingBlanks = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Stats for selected employee
  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const totalHalfDay = records.filter((r) => r.status === "half_day").length;
  const totalWeekOff = records.filter((r) => r.status === "week_off").length;

  const handleMark = (date: string, status: string) => {
    if (!selectedEmpId) return;
    markMutation.mutate({ date, status });
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={selectedEmpId ? String(selectedEmpId) : ""}
          onValueChange={(v) => setSelectedEmpId(Number(v))}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select beautician..." />
          </SelectTrigger>
          <SelectContent>
            {nonAdmins.map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={() => setCurrent(new Date(year, month - 2, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold px-2">{format(current, "MMMM yyyy")}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrent(new Date(year, month, 1))}
            disabled={month === new Date().getMonth() + 1 && year === new Date().getFullYear()}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${s.color}`} />
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-1">• Tap a day to cycle status • Fri–Sun: no Week Off</span>
      </div>

      {/* Calendar */}
      {!selectedEmpId ? (
        <div className="text-center py-12 text-muted-foreground">
          Select a beautician to manage attendance
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`b-${i}`} className="h-14 border-r border-b" />
              ))}

              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const record = recordMap.get(key);
                const cfg = record ? STATUS_DISPLAY[record.status] : null;
                const today = isToday(day);
                const dayNum = getDay(day);
                const isFriSun = dayNum === 5 || dayNum === 6 || dayNum === 0;
                const futureDay = day > new Date();

                // Cycle order on tap
                const cycleStatus = () => {
                  if (futureDay) return;
                  const options = isFriSun
                    ? ["present", "half_day", "absent"]
                    : ["present", "half_day", "absent", "week_off"];
                  const current = record?.status;
                  const idx = current ? options.indexOf(current) : -1;
                  const next = options[(idx + 1) % options.length];
                  handleMark(key, next);
                };

                return (
                  <div
                    key={key}
                    onClick={cycleStatus}
                    className={`h-14 flex flex-col items-center justify-center border-b border-r cursor-pointer hover:bg-gray-50 transition-colors select-none
                      ${today ? "bg-primary/5 font-bold" : ""}
                      ${isFriSun ? "bg-orange-50/30" : ""}
                      ${futureDay ? "opacity-40 cursor-default" : ""}
                    `}
                  >
                    <span className={`text-xs mb-1 ${today ? "text-primary" : "text-gray-700"}`}>
                      {format(day, "d")}
                    </span>
                    {cfg ? (
                      <div className={`w-7 h-5 rounded text-[10px] font-bold flex items-center justify-center ${cfg.color}`}>
                        {cfg.label}
                      </div>
                    ) : (
                      <div className="w-7 h-5 rounded border border-dashed border-gray-200" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: totalPresent, label: "Present", color: "text-green-600" },
              { value: totalAbsent, label: "Absent", color: "text-red-500" },
              { value: totalHalfDay, label: "Half Days", color: "text-yellow-600" },
              { value: totalWeekOff, label: "Week Offs", color: "text-blue-500" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-3 text-center shadow-sm border">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Tap a date to cycle through statuses. Orange-tinted = Fri/Sat/Sun (no Week Off).
          </p>
        </>
      )}
    </div>
  );
}
