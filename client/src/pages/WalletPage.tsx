import { Wallet, TrendingUp, CreditCard, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WalletPage() {
  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold font-display text-gray-900 mb-6">Wallet</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl shadow-gray-200 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8" />
        <div className="relative z-10">
          <p className="text-gray-400 text-sm font-medium mb-1">Total Earnings</p>
          <h2 className="text-4xl font-bold font-display mb-6">$1,240.50</h2>
          
          <div className="flex gap-3">
             <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
               <ArrowUpRight className="w-4 h-4 mr-2" /> Withdraw
             </Button>
             <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
               <CreditCard className="w-4 h-4 mr-2" /> Settings
             </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-4 rounded-xl border-none shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900">12</span>
          <span className="text-xs text-muted-foreground">Jobs Done</span>
        </Card>
        <Card className="p-4 rounded-xl border-none shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-gray-900">$240</span>
          <span className="text-xs text-muted-foreground">Bonus</span>
        </Card>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="font-bold text-lg mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
             <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-xs text-gray-500">JD</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Job Payment</p>
                    <p className="text-xs text-muted-foreground">Today, 2:30 PM</p>
                  </div>
                </div>
                <span className="font-bold text-green-600">+$85.00</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
