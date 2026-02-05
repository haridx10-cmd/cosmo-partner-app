import { ShoppingBag } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen pb-24 px-6 text-center bg-gray-50">
      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
        <ShoppingBag className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold font-display text-gray-900 mb-2">Inventory Store</h2>
      <p className="text-muted-foreground max-w-xs mx-auto">
        Purchase salon products and replenish your kit directly from the app.
      </p>
      <div className="mt-8 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
        Coming Soon
      </div>
    </div>
  );
}
