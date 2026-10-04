import { AppScreen } from "@/components/app/app-screen";
import { BodySkeleton, Bar } from "@/components/app/skeleton";

export default function Loading() {
  return (
    <AppScreen title="Availability" subtitle="When people can book you.">
      <BodySkeleton>
        {/* The real screen's shape, in the real screen's column: a timezone
            field, the schedule chips, then the week. A skeleton of a
            different layout is a layout shift with extra steps. */}
        <div className="flex w-full max-w-[660px] flex-col gap-[18px]">
        <div className="flex flex-col gap-[7px]">
          <Bar w={70} h={11} />
          <Bar w="62%" h={34} />
        </div>
        <div className="flex gap-[7px]">
          <Bar w={140} h={30} />
          <Bar w={96} h={30} />
          <Bar w={120} h={30} />
        </div>
        {/* The week's rules: one row a day. */}
        <div className="overflow-hidden rounded-[9px] border border-line bg-surface">
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
        </div>
      </BodySkeleton>
    </AppScreen>
  );
}
