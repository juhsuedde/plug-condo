import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const location = useLocation();
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur border-t pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 px-2 pt-2 pb-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2 rounded-2xl transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span className={`flex items-center justify-center h-9 w-12 rounded-full transition-colors ${active ? "bg-primary-soft" : ""}`}>
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
