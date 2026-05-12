import type { ReactNode } from "react";

export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-stretch justify-center bg-surface md:py-8">
      <div className="relative w-full max-w-[430px] min-h-screen md:min-h-[844px] md:max-h-[900px] bg-background md:rounded-[44px] md:shadow-pop md:border md:overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
