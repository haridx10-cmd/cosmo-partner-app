import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, PlusCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface PaymentEntry {
  id: number;
  amount: string;
  paymentMode: string;
  customerName: string | null;
  notes: string | null;
  isAdhoc: number;
  status: string;
  createdAt: string;
  screenshotData: string | null;
  screenshotMime: string | null;
}

export default function AdhocPaymentPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"cash" | "upi">("cash");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotB64, setScreenshotB64] = useState<string | null>(null);
  const [screenshotMime, setScreenshotMime] = useState("image/jpeg");
  const [viewScreenshot, setViewScreenshot] = useState<{ data: string; mime: string } | null>(null);

  const { data: entries = [] } = useQuery<PaymentEntry[]>({
    queryKey: ["/api/payments/me"],
    queryFn: () => fetch("/api/payments/me").then(r => r.json()),
    refetchInterval: 15000,
  });

  const adhocEntries = entries.filter(e => e.isAdhoc === 1);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments/adhoc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMode: mode,
          screenshotData: screenshotB64,
          screenshotMime,
          notes: notes || null,
          customerName: customerName || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Payment submitted for approval", description: "Admin will review and approve it shortly." });
      qc.invalidateQueries({ queryKey: ["/api/payments/me"] });
      setAmount(""); setCustomerName(""); setNotes(""); setScreenshotB64(null); setMode("cash");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => setScreenshotB64((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  };

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Approved</span>;
    if (status === "rejected") return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Rejected</span>;
    return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending approval</span>;
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-white">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold font-display">Ad-hoc Payment Entry</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
        <p className="text-sm text-amber-800">
          Use this for WhatsApp or walk-in appointments that don't have an order in the app. Your entry will be reviewed by admin before it counts towards your earnings.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4 mb-8">
        <div>
          <label className="text-sm font-medium block mb-1">Customer Name (optional)</label>
          <Input placeholder="e.g. Priya Sharma" value={customerName} onChange={e => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Amount Received (₹)</label>
          <Input type="number" min="0" placeholder="e.g. 1500" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Payment Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("cash")}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${mode === "cash" ? "bg-primary text-white border-primary" : "border-gray-200 text-gray-600"}`}
            >
              💵 Cash
            </button>
            <button
              type="button"
              onClick={() => setMode("upi")}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${mode === "upi" ? "bg-primary text-white border-primary" : "border-gray-200 text-gray-600"}`}
            >
              📱 UPI
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Payment Screenshot</label>
          <input
            type="file"
            accept="image/*"
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary"
            onChange={handleImagePick}
          />
          {screenshotB64 && <p className="text-xs text-green-600 mt-1">✓ Screenshot attached</p>}
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Service Notes (optional)</label>
          <Input placeholder="e.g. Hair colour + trim" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <Button
          className="w-full h-12 text-base"
          disabled={!amount || isNaN(parseFloat(amount)) || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          {submitMutation.isPending ? "Submitting..." : "Submit for Admin Approval"}
        </Button>
      </div>

      {/* History */}
      {adhocEntries.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">My Ad-hoc Entries</h2>
          <div className="space-y-3">
            {adhocEntries.map(e => (
              <div key={e.id} className={`border rounded-xl p-3 ${e.status === "rejected" ? "border-red-200 bg-red-50" : ""}`}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    {e.customerName && <p className="text-xs text-gray-500 font-medium">{e.customerName}</p>}
                    <p className={`text-base font-bold ${e.status === "rejected" ? "text-red-400 line-through" : "text-gray-800"}`}>
                      ₹{parseFloat(e.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">{e.paymentMode}</p>
                    {e.notes && <p className="text-xs text-gray-500 mt-0.5">{e.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {statusLabel(e.status)}
                    {e.screenshotData && (
                      <button
                        className="text-xs text-primary underline"
                        onClick={() => setViewScreenshot({ data: e.screenshotData!, mime: e.screenshotMime ?? "image/jpeg" })}
                      >
                        View receipt
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(e.createdAt), "d MMM yyyy, h:mm a")}</p>
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
