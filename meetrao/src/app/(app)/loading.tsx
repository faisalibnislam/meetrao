import { Bar, BodySkeleton, RowsSkeleton } from "@/components/app/skeleton";

/* The fallback boundary for app routes without one of their own, the new and
   edit screens, reached by a button rather than a sidebar tab. Those titles are
   not static (a meeting's edit screen is named after the meeting), so this one
   shimmers the header too, at the AppScreen header's own metrics: a 19px title
   over a 12.5px subtitle, inside the same 1120px column. */
export default function Loading() {
  return (
    <>
      <header className="flex-none border-b border-line bg-ground">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-[6px] px-[26px] py-[16px] max-[820px]:px-[16px] max-[820px]:py-[14px]">
          <Bar w={196} h={19} />
          <Bar w={280} h={12} />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-ground">
        <div className="mx-auto max-w-[1120px] px-[26px] pt-[24px] pb-[90px] max-[820px]:px-[16px] max-[820px]:pt-[18px]">
          <BodySkeleton>
            <RowsSkeleton rows={4} />
          </BodySkeleton>
        </div>
      </div>
    </>
  );
}
