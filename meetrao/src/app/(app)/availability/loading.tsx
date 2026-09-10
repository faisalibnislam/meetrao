import { AppScreen } from "@/components/app/app-screen";
import { BodySkeleton, Bar, CardsSkeleton } from "@/components/app/skeleton";

export default function Loading() {
  return (
    <AppScreen title="Availability" subtitle="When people can book you.">
      <BodySkeleton>
        <CardsSkeleton count={2} height={104} min={260} />
        {/* The week's rules: one row a day. */}
        <div className="mt-[6px] overflow-hidden rounded-[9px] border border-line bg-surface">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`flex items-center gap-[14px] px-[15px] py-[12px] ${i > 0 ? "border-t border-line-soft" : ""}`}
            >
              <Bar w={74} h={12} className="flex-none" />
              <Bar w={i > 4 ? "22%" : "44%"} h={12} />
            </div>
          ))}
        </div>
      </BodySkeleton>
    </AppScreen>
  );
}
