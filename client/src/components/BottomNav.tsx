import { Link, useLocation } from "wouter";
import { Home, ListTodo, Wallet, ShoppingBag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "New", icon: Home },
    { href: "/ongoing", label: "Ongoing", icon: ListTodo },
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/products", label: "Inventory", icon: ShoppingBag },
    { href: "/menu", label: "Menu", icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-border z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2 group cursor-pointer focus:outline-none">
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300 ease-out",
                isActive ? "bg-primary/10 -translate-y-1" : "group-hover:bg-muted"
              )}>
                <Icon 
                  size={24} 
                  className={cn(
                    "transition-colors duration-300",
                    isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground group-hover:text-foreground"
                  )} 
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-1 transition-colors duration-300",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
