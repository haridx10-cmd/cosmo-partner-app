import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Wallet, TrendingDown, ArrowUpCircle, Camera, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface BalanceInfo {
  currentBalance: number;
  spendsThisMonth: number;
  upiNumber: string | null;
  qrCodeData: string | null;
  hasPendingTopUp: boolean;
}

interface LedgerEntry {
  id: number;
  type: string;
  amount: string;
  balanceAfter: string;
  notes: string | null;
  createdAt: string;
}

interface SpendEntry {
  id: number;
  amount: string;
  notes: string | null;
  status: string;
  createdAt: string;
  screenshotData: string | null;
  screenshotMime: string | null;
}

export default function AutoBalancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [showSubmit, setShowSubmit] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpNotes, setTopUpNotes] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendNotes, setSpendNotes] = useState("");
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null);
  const [screenshotMime, setScreenshotMime] = useState("image/jpeg");
  const [viewScreenshot, setViewScreenshot] = useState<{ data: string; mime: string } | null>(null);

  const { data: info, isLoading } = useQuery<BalanceInfo>({
    queryKey: ["/api/auto-balance/me"],
    queryFn: () => fetch("/api/auto-balance/me").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: spends = [] } = useQuery<SpendEntry[]>({
    queryKey: ["/api/auto-balance/spend-entries"],
    queryFn: () => fetch("/api/auto-balance/spend-entries").then(r => r.json()),
    refetchInterval: 15000,
  });

  const { data: ledger = [] } = useQuery<LedgerEntry[]>({
    queryKey: ["/api/auto-balance/ledger"],
    queryFn: () => fetch("/api/auto-balance/ledger").then(r => r.json()),
    refetchInterval: 15000,
  });

  const submitSpendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/spend/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: spendAmount, screenshotData: screenshotB64, screenshotMime, notes: spendNotes }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Spend submitted", description: "Amount deducted from your balance." });
      qc.invalidateQueries({ queryKey: ["/api/auto-balance/me"] });
      qc.invalidateQueries({ queryKey: ["/api/auto-balance/spend-entries"] });
      qc.invalidateQueries({ queryKey: ["/api/auto-balance/ledger"] });
      setShowSubmit(false);
      setSpendAmount(""); setSpendNotes(""); setScreenshotB64(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const topUpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/top-up-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedAmount: topUpAmount || null, notes: topUpNotes || null }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Top-up requested", description: "Admin has been notified." });
      qc.invalidateQueries({ queryKey: ["/api/auto-balance/me"] });
      setShowTopUp(false);
      setTopUpAmount(""); setTopUpNotes("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix
      const b64 = result.split(",")[1];
      setScreenshotB64(b64);
    };
    reader.readAsDataURL(file);
  };

  const balance = info?.currentBalance ?? 0;
  const isNegative = balance < 0;
  const isLow = balance >= 0 && balance < 200;

  const typeLabel = (type: string) => {
    if (type === "top_up") return { label: "Top-up", color: "text-green-600", sign: "+" };
    if (type === "spend") return { label: "Spend", color: "text-red-500", sign: "-" };
    if (type === "reversal") return { label: "Reversal", color: "text-blue-500", sign: "+" };
    return { label: type, color: "text-gray-600", sign: "" };
  };

  const statusBadge = (status: string) => {
    if (status === "verified") return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Verified</span>;
    if (status === "rejected") return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Rejected</span>;
    return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Approved</span>;
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-white">
      <h1 className="text-xl font-bold mb-4 font-display flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" /> My Auto Balance
      </h1>

      {/* Low balance / negative alerts */}
      {isNegative && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">Your balance is negative. Please request a top-up from admin.</p>
        </div>
      )}
      {isLow && !isNegative && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700">Your balance is low (₹{balance.toFixed(2)}). Consider requesting a top-up.</p>
        </div>
      )}
      {info?.hasPendingTopUp && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">You have a pending top-up request. Admin will process it soon.</p>
        </div>
      )}

      {/* Balance card */}
      <div className={`rounded-2xl p-5 mb-4 ${isNegative ? "bg-red-600" : "bg-primary"} text-white`}>
        <p className="text-sm opacity-80 mb-1">Current Balance</p>
        <p className="text-4xl font-bold mb-3">₹{balance.toFixed(2)}</p>
        <div className="flex items-center gap-1 text-sm opacity-90">
          <TrendingDown className="w-4 h-4" />
          <span>₹{(info?.spendsThisMonth ?? 0).toFixed(2)} spent this month</span>
        </div>
      </div>

      {/* QR / UPI section */}
      {(info?.qrCodeData || info?.upiNumber) && (
        <div className="border rounded-xl p-4 mb-4 flex flex-col items-center gap-3">
          {info.qrCodeData && (
            <img
              src={`data:image/png;base64,${info.qrCodeData}`}
              alt="QR Code"
              className="w-36 h-36 object-contain"
            />
          )}
          {info.upiNumber && (
            <p className="text-sm font-medium text-gray-700">UPI: <span className="font-mono text-primary">{info.upiNumber}</span></p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mb-6">
        <Button className="flex-1" onClick={() => setShowSubmit(true)}>
          <Camera className="w-4 h-4 mr-2" /> Submit Spend
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setShowTopUp(true)} disabled={info?.hasPendingTopUp}>
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          {info?.hasPendingTopUp ? "Requested" : "Request Top-Up"}
        </Button>
      </div>

      {/* Spend entries */}
      {spends.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">My Spends</h2>
          <div className="space-y-2">
            {spends.map(s => (
              <div key={s.id} className={`rounded-xl border p-3 ${s.status === "rejected" ? "border-red-200 bg-red-50" : "bg-white"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold ${s.status === "rejected" ? "text-red-500" : "text-gray-800"}`}>
                    {s.status === "rejected" ? "−" : "−"}₹{parseFloat(s.amount).toFixed(2)}
                  </span>
                  {statusBadge(s.status)}
                </div>
                {s.notes && <p className="text-xs text-gray-500 mb-1">{s.notes}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{format(new Date(s.createdAt), "d MMM, h:mm a")}</span>
                  {s.screenshotData && (
                    <button
                      className="text-xs text-primary underline"
                      onClick={() => setViewScreenshot({ data: s.screenshotData!, mime: s.screenshotMime ?? "image/jpeg" })}
                    >
                      View receipt
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger */}
      {ledger.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-2">Transaction History</h2>
          <div className="space-y-2">
            {ledger.map(entry => {
              const { label, color, sign } = typeLabel(entry.type);
              const amt = Math.abs(parseFloat(entry.amount)).toFixed(2);
              return (
                <div key={entry.id} className="flex items-start justify-between border-b pb-2">
                  <div>
                    <p className={`text-sm font-medium ${color}`}>{sign}₹{amt} <span className="text-gray-400 font-normal">({label})</span></p>
                    {entry.notes && <p className="text-xs text-gray-400">{entry.notes}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), "d MMM, h:mm a")}</p>
                  </div>
                  <span className="text-xs text-gray-500">Bal ₹{parseFloat(entry.balanceAfter).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Spend Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Submit Spend</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium block mb-1">Amount Spent (₹)</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 250"
                value={spendAmount}
                onChange={e => setSpendAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Notes (optional)</label>
              <Input
                placeholder="What was this for?"
                value={spendNotes}
                onChange={e => setSpendNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Receipt / Screenshot</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary"
                onChange={handleImagePick}
              />
              {screenshotB64 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Image selected
                </div>
              )}
            </div>
            <Button
              className="w-full"
              disabled={!spendAmount || isNaN(parseFloat(spendAmount)) || submitSpendMutation.isPending}
              onClick={() => submitSpendMutation.mutate()}
            >
              {submitSpendMutation.isPending ? "Submitting..." : "Submit Spend"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top-up Request Dialog */}
      <Dialog open={showTopUp} onOpenChange={setShowTopUp}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Request Top-Up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Admin will be notified to add balance to your wallet.</p>
            <div>
              <label className="text-sm font-medium block mb-1">Requested Amount (₹) — optional</label>
              <Input
                type="number"
                min="0"
                placeholder="Leave blank to let admin decide"
                value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Notes (optional)</label>
              <Input
                placeholder="Any details for admin"
                value={topUpNotes}
                onChange={e => setTopUpNotes(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={topUpMutation.isPending}
              onClick={() => topUpMutation.mutate()}
            >
              {topUpMutation.isPending ? "Requesting..." : "Send Request"}
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
