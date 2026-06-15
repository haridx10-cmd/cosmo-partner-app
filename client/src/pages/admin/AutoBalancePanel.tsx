import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Wallet, Plus, CheckCircle, XCircle, Clock, Image, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface EmployeeBalance {
  id: number;
  name: string;
  currentBalance: number;
  spendsThisMonth: number;
  upiNumber: string | null;
  qrCodeData: string | null;
  pendingTopUpCount: number;
}

interface SpendEntry {
  id: number;
  employeeId: number;
  employeeName: string | null;
  amount: string;
  screenshotData: string | null;
  screenshotMime: string | null;
  notes: string | null;
  status: string;
  reviewedById: number | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface TopUpRequest {
  id: number;
  employeeId: number;
  employeeName: string | null;
  requestedAmount: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
  fulfilledAt: string | null;
}

interface LedgerEntry {
  id: number;
  type: string;
  amount: string;
  balanceAfter: string;
  notes: string | null;
  createdAt: string;
}

export default function AutoBalancePanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [upiNumber, setUpiNumber] = useState("");
  const [showUpiEdit, setShowUpiEdit] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [viewScreenshot, setViewScreenshot] = useState<{ data: string; mime: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"wallets" | "spends" | "requests">("wallets");
  const [qrFile, setQrFile] = useState<string | null>(null);
  const [qrMime, setQrMime] = useState("image/png");

  const { data: employees = [], isLoading } = useQuery<EmployeeBalance[]>({
    queryKey: ["/api/admin/auto-balance"],
    queryFn: () => fetch("/api/admin/auto-balance").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: spends = [] } = useQuery<SpendEntry[]>({
    queryKey: ["/api/admin/spend-entries", selectedEmpId],
    queryFn: () => fetch(`/api/admin/spend-entries${selectedEmpId ? `?empId=${selectedEmpId}` : ""}`).then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: topUpReqs = [] } = useQuery<TopUpRequest[]>({
    queryKey: ["/api/admin/top-up-requests"],
    queryFn: () => fetch("/api/admin/top-up-requests").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: ledger = [] } = useQuery<LedgerEntry[]>({
    queryKey: ["/api/admin/auto-balance/ledger", selectedEmpId],
    queryFn: () => {
      if (!selectedEmpId) return Promise.resolve([]);
      return fetch(`/api/admin/auto-balance/ledger/${selectedEmpId}`).then(r => r.json());
    },
    enabled: !!selectedEmpId && showLedger,
  });

  const topUpMutation = useMutation({
    mutationFn: async ({ empId, amount, notes }: { empId: number; amount: string; notes: string }) => {
      const res = await fetch(`/api/admin/auto-balance/${empId}/top-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), notes: notes || null }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Top-up added successfully" });
      qc.invalidateQueries({ queryKey: ["/api/admin/auto-balance"] });
      setTopUpAmount(""); setTopUpNotes("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/spend-entries/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Rejected by admin" }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Spend rejected and reversed" });
      qc.invalidateQueries({ queryKey: ["/api/admin/spend-entries", selectedEmpId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/auto-balance"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/spend-entries/${id}/verify`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Spend verified" });
      qc.invalidateQueries({ queryKey: ["/api/admin/spend-entries", selectedEmpId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/top-up-requests/${id}/acknowledge`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request acknowledged" });
      qc.invalidateQueries({ queryKey: ["/api/admin/top-up-requests"] });
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/top-up-requests/${id}/fulfill`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request marked as fulfilled" });
      qc.invalidateQueries({ queryKey: ["/api/admin/top-up-requests"] });
    },
  });

  const upiMutation = useMutation({
    mutationFn: async ({ empId, upiNumber, qrCodeData }: { empId: number; upiNumber: string; qrCodeData: string | null }) => {
      const res = await fetch(`/api/admin/employee-upi/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upiNumber, qrCodeData }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "UPI profile updated" });
      qc.invalidateQueries({ queryKey: ["/api/admin/auto-balance"] });
      setShowUpiEdit(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleQrFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrMime(file.type || "image/png");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setQrFile(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const pendingReqs = topUpReqs.filter(r => r.status === "pending");

  const statusBadge = (status: string) => {
    if (status === "verified") return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>;
    if (status === "rejected") return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Rejected</span>;
    return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Approved</span>;
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Auto Balance</h2>
        {pendingReqs.length > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            {pendingReqs.length} pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4 gap-0">
        {(["wallets", "spends", "requests"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
          >
            {tab === "wallets" ? "Wallets" : tab === "spends" ? "Spends" : "Top-ups"}
            {tab === "requests" && pendingReqs.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">{pendingReqs.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ---- WALLETS TAB ---- */}
      {activeTab === "wallets" && (
        <div className="space-y-3">
          {employees.map(emp => (
            <div
              key={emp.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedEmpId === emp.id ? "border-primary bg-primary/5" : "hover:border-gray-300"}`}
              onClick={() => setSelectedEmpId(emp.id === selectedEmpId ? null : emp.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{emp.name}</p>
                  <p className={`text-lg font-bold ${emp.currentBalance < 0 ? "text-red-600" : "text-gray-800"}`}>
                    ₹{emp.currentBalance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">₹{emp.spendsThisMonth.toFixed(2)} spent this month</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {emp.currentBalance < 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  {emp.pendingTopUpCount > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {emp.pendingTopUpCount} top-up req
                    </span>
                  )}
                  {selectedEmpId === emp.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {selectedEmpId === emp.id && (
                <div className="mt-4 space-y-3 border-t pt-3" onClick={e => e.stopPropagation()}>
                  {/* QR display */}
                  {emp.qrCodeData && (
                    <div className="flex justify-center">
                      <img src={`data:image/png;base64,${emp.qrCodeData}`} alt="QR" className="w-28 h-28 object-contain" />
                    </div>
                  )}
                  {emp.upiNumber && <p className="text-xs text-center text-gray-600">UPI: <span className="font-mono">{emp.upiNumber}</span></p>}

                  {/* Add top-up */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount (₹)"
                      value={topUpAmount}
                      onChange={e => setTopUpAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={!topUpAmount || topUpMutation.isPending}
                      onClick={() => topUpMutation.mutate({ empId: emp.id, amount: topUpAmount, notes: topUpNotes })}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={topUpNotes}
                    onChange={e => setTopUpNotes(e.target.value)}
                  />

                  {/* Edit UPI/QR */}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setUpiNumber(emp.upiNumber ?? ""); setShowUpiEdit(true); }}>
                    Edit UPI / QR Code
                  </Button>

                  {/* Ledger toggle */}
                  <button
                    className="w-full text-xs text-primary flex items-center justify-center gap-1"
                    onClick={() => setShowLedger(!showLedger)}
                  >
                    {showLedger ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showLedger ? "Hide" : "Show"} Transaction History
                  </button>
                  {showLedger && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {ledger.length === 0 ? (
                        <p className="text-xs text-center text-muted-foreground">No transactions</p>
                      ) : ledger.map(l => (
                        <div key={l.id} className="flex justify-between text-xs border-b pb-1">
                          <span className={l.type === "top_up" || l.type === "reversal" ? "text-green-600" : "text-red-500"}>
                            {l.type === "top_up" || l.type === "reversal" ? "+" : "−"}₹{Math.abs(parseFloat(l.amount)).toFixed(2)} ({l.type})
                          </span>
                          <span className="text-gray-400">{format(new Date(l.createdAt), "d MMM")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- SPENDS TAB ---- */}
      {activeTab === "spends" && (
        <div>
          {/* Employee filter */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              className={`text-xs px-3 py-1 rounded-full border ${!selectedEmpId ? "bg-primary text-white border-primary" : "border-gray-200"}`}
              onClick={() => setSelectedEmpId(null)}
            >All</button>
            {employees.map(e => (
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
            {spends.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No spend entries</p>}
            {spends.map(s => (
              <div key={s.id} className={`border rounded-xl p-3 ${s.status === "rejected" ? "border-red-200 bg-red-50" : ""}`}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-sm">{s.employeeName}</p>
                    <p className={`text-base font-bold ${s.status === "rejected" ? "text-red-400 line-through" : "text-gray-800"}`}>
                      ₹{parseFloat(s.amount).toFixed(2)}
                    </p>
                    {s.notes && <p className="text-xs text-gray-500">{s.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(s.createdAt), "d MMM, h:mm a")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {statusBadge(s.status)}
                    {s.screenshotData && (
                      <button
                        className="text-xs text-primary underline flex items-center gap-0.5"
                        onClick={() => setViewScreenshot({ data: s.screenshotData!, mime: s.screenshotMime ?? "image/jpeg" })}
                      >
                        <Image className="w-3 h-3" /> Receipt
                      </button>
                    )}
                  </div>
                </div>
                {s.status === "approved" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                      disabled={verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate(s.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate(s.id)}
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

      {/* ---- TOP-UP REQUESTS TAB ---- */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {topUpReqs.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No top-up requests</p>}
          {topUpReqs.map(r => (
            <div key={r.id} className="border rounded-xl p-3">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-semibold text-sm">{r.employeeName}</p>
                  <p className="text-base font-bold text-gray-800">
                    {r.requestedAmount ? `₹${parseFloat(r.requestedAmount).toFixed(2)}` : "Amount not specified"}
                  </p>
                  {r.notes && <p className="text-xs text-gray-500">{r.notes}</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "d MMM, h:mm a")}</p>
                </div>
                <div>
                  {r.status === "pending" && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>}
                  {r.status === "acknowledged" && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Acknowledged</span>}
                  {r.status === "fulfilled" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Fulfilled</span>}
                </div>
              </div>
              {r.status === "pending" && (
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => acknowledgeMutation.mutate(r.id)} disabled={acknowledgeMutation.isPending}>
                  Acknowledge
                </Button>
              )}
              {r.status === "acknowledged" && (
                <Button size="sm" className="w-full mt-2" onClick={() => fulfillMutation.mutate(r.id)} disabled={fulfillMutation.isPending}>
                  Mark as Fulfilled
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* UPI Edit Dialog */}
      <Dialog open={showUpiEdit} onOpenChange={setShowUpiEdit}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader><DialogTitle>Edit UPI / QR for {selectedEmp?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium block mb-1">UPI Number</label>
              <Input placeholder="e.g. 9876543210@upi" value={upiNumber} onChange={e => setUpiNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">QR Code Image</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary"
                onChange={handleQrFile}
              />
              {(qrFile || selectedEmp?.qrCodeData) && (
                <img
                  src={`data:${qrMime};base64,${qrFile ?? selectedEmp?.qrCodeData}`}
                  alt="QR Preview"
                  className="mt-2 w-24 h-24 object-contain border rounded"
                />
              )}
            </div>
            <Button
              className="w-full"
              disabled={upiMutation.isPending}
              onClick={() => {
                if (!selectedEmpId) return;
                upiMutation.mutate({ empId: selectedEmpId, upiNumber, qrCodeData: qrFile ?? selectedEmp?.qrCodeData ?? null });
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Screenshot viewer */}
      {viewScreenshot && (
        <Dialog open={!!viewScreenshot} onOpenChange={() => setViewScreenshot(null)}>
          <DialogContent className="max-w-sm mx-auto">
            <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
            <img
              src={`data:${viewScreenshot.mime};base64,${viewScreenshot.data}`}
              alt="Receipt"
              className="w-full rounded-lg max-h-96 object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
