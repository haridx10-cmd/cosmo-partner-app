import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { TrendingUp, CheckCircle, XCircle, Image, ChevronDown, ChevronUp, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface EmployeeRevenue {
  id: number;
  name: string;
  monthlyRevenue: number;
  monthlyCount: number;
  allTimeRevenue: number;
  pendingAdhocCount: number;
}

interface PaymentEntry {
  id: number;
  employeeId: number;
  employeeName: string | null;
  orderId: number | null;
  amount: string;
  paymentMode: string;
  screenshotData: string | null;
  screenshotMime: string | null;
  notes: string | null;
  customerName: string | null;
  isAdhoc: number;
  status: string;
  createdAt: string;
}

export default function RevenuePanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "entries" | "adhoc">("overview");
  const [viewScreenshot, setViewScreenshot] = useState<{ data: string; mime: string } | null>(null);

  const { data: revenue = [], isLoading } = useQuery<EmployeeRevenue[]>({
    queryKey: ["/api/admin/payments/revenue"],
    queryFn: () => fetch("/api/admin/payments/revenue").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: allEntries = [] } = useQuery<PaymentEntry[]>({
    queryKey: ["/api/admin/payments", selectedEmpId],
    queryFn: () => fetch(`/api/admin/payments${selectedEmpId ? `?empId=${selectedEmpId}` : ""}`).then(r => r.json()),
    refetchInterval: 15000,
  });

  const pendingAdhoc = allEntries.filter(e => e.isAdhoc === 1 && e.status === "pending_approval");
  const regularEntries = allEntries.filter(e => activeTab === "entries" ? e.isAdhoc === 0 : e.isAdhoc === 1);

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/payments/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment approved" });
      qc.invalidateQueries({ queryKey: ["/api/admin/payments", selectedEmpId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/revenue"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/payments/${id}/reject`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment rejected" });
      qc.invalidateQueries({ queryKey: ["/api/admin/payments", selectedEmpId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/payments/revenue"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalPending = revenue.reduce((s, e) => s + e.pendingAdhocCount, 0);
  const totalMonthly = revenue.reduce((s, e) => s + e.monthlyRevenue, 0);

  const statusBadge = (status: string) => {
    if (status === "approved") return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Approved</span>;
    if (status === "rejected") return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Rejected</span>;
    return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>;
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <IndianRupee className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Revenue</h2>
        {totalPending > 0 && (
          <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {totalPending} pending approval
          </span>
        )}
      </div>

      {/* Summary card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 text-white mb-4">
        <p className="text-gray-300 text-xs mb-1">Total Revenue — This Month (All Beauticians)</p>
        <p className="text-3xl font-bold">₹{totalMonthly.toLocaleString("en-IN")}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {(["overview", "entries", "adhoc"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
          >
            {tab === "overview" ? "Overview" : tab === "entries" ? "Order Payments" : (
              <span className="flex items-center justify-center gap-1">
                Ad-hoc {totalPending > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{totalPending}</span>}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- OVERVIEW TAB ---- */}
      {activeTab === "overview" && (
        <div className="space-y-3">
          {revenue.map(emp => (
            <div
              key={emp.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedEmpId === emp.id ? "border-primary bg-primary/5" : "hover:border-gray-300"}`}
              onClick={() => setSelectedEmpId(emp.id === selectedEmpId ? null : emp.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{emp.name}</p>
                  <p className="text-2xl font-bold text-primary">₹{emp.monthlyRevenue.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">{emp.monthlyCount} payments this month</p>
                  <p className="text-xs text-gray-400">All time: ₹{emp.allTimeRevenue.toLocaleString("en-IN")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {emp.pendingAdhocCount > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {emp.pendingAdhocCount} pending
                    </span>
                  )}
                  {selectedEmpId === emp.id ? <ChevronUp className="w-4 h-4 text-gray-400 mt-2" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-2" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- ORDER PAYMENTS TAB ---- */}
      {activeTab === "entries" && (
        <div>
          {/* Employee filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              className={`text-xs px-3 py-1 rounded-full border ${!selectedEmpId ? "bg-primary text-white border-primary" : "border-gray-200"}`}
              onClick={() => setSelectedEmpId(null)}
            >All</button>
            {revenue.map(e => (
              <button
                key={e.id}
                className={`text-xs px-3 py-1 rounded-full border ${selectedEmpId === e.id ? "bg-primary text-white border-primary" : "border-gray-200"}`}
                onClick={() => setSelectedEmpId(e.id)}
              >
                {e.name}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {regularEntries.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No order payments yet</p>}
            {regularEntries.map(e => (
              <div key={e.id} className="border rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{e.employeeName}</p>
                    <p className="text-base font-bold text-gray-800">₹{parseFloat(e.amount).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400 capitalize">{e.paymentMode} · Order #{e.orderId}</p>
                    {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.createdAt), "d MMM yyyy, h:mm a")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {statusBadge(e.status)}
                    {e.screenshotData && (
                      <button
                        className="text-xs text-primary underline flex items-center gap-0.5"
                        onClick={() => setViewScreenshot({ data: e.screenshotData!, mime: e.screenshotMime ?? "image/jpeg" })}
                      >
                        <Image className="w-3 h-3" /> Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- AD-HOC PAYMENTS TAB ---- */}
      {activeTab === "adhoc" && (
        <div>
          {/* Employee filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              className={`text-xs px-3 py-1 rounded-full border ${!selectedEmpId ? "bg-primary text-white border-primary" : "border-gray-200"}`}
              onClick={() => setSelectedEmpId(null)}
            >All</button>
            {revenue.map(e => (
              <button
                key={e.id}
                className={`text-xs px-3 py-1 rounded-full border ${selectedEmpId === e.id ? "bg-primary text-white border-primary" : "border-gray-200"}`}
                onClick={() => setSelectedEmpId(e.id)}
              >
                {e.name}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {regularEntries.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No ad-hoc entries</p>}
            {regularEntries.map(e => (
              <div key={e.id} className={`border rounded-xl p-3 ${e.status === "pending_approval" ? "border-amber-200 bg-amber-50" : e.status === "rejected" ? "border-red-200 bg-red-50" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{e.employeeName}</p>
                    {e.customerName && <p className="text-xs text-gray-400">Customer: {e.customerName}</p>}
                    <p className="text-base font-bold text-gray-800">₹{parseFloat(e.amount).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-gray-400 capitalize">{e.paymentMode}</p>
                    {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.createdAt), "d MMM yyyy, h:mm a")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {statusBadge(e.status)}
                    {e.screenshotData && (
                      <button
                        className="text-xs text-primary underline flex items-center gap-0.5"
                        onClick={() => setViewScreenshot({ data: e.screenshotData!, mime: e.screenshotMime ?? "image/jpeg" })}
                      >
                        <Image className="w-3 h-3" /> Receipt
                      </button>
                    )}
                  </div>
                </div>
                {e.status === "pending_approval" && (
                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(e.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(e.id)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot viewer */}
      {viewScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewScreenshot(null)}
        >
          <img
            src={`data:${viewScreenshot.mime};base64,${viewScreenshot.data}`}
            alt="Receipt"
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
