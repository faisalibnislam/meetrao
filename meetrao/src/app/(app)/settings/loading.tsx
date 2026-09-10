import { AppScreen } from "@/components/app/app-screen";
import { Bar, BodySkeleton } from "@/components/app/skeleton";

/* Settings keeps its two-column frame while it loads: the nav on the left is a
   fixed set of links, so only the panel on the right is unknown. */
export default function Loading() {
  return (
    <AppScreen title="Settings">
      <BodySkeleton>
        <div className="mx-auto grid w-full max-w-[780px] grid-cols-[158px_minmax(0,1fr)] items-start gap-[34px] max-[820px]:flex max-[820px]:flex-col max-[820px]:gap-[18px]">
          <div className="flex flex-col gap-[10px] max-[820px]:flex-row max-[820px]:flex-wrap">
            {[86, 72, 94, 64].map((w) => (
              <Bar key={w} w={w} h={13} />
            ))}
          </div>
          <div className="flex min-w-0 max-w-[560px] flex-col gap-[20px]">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-[13px] rounded-[9px] border border-line bg-surface p-[16px]">
                <Bar w={132} h={14} />
                <Bar w="72%" h={11} />
                <Bar h={34} className="rounded-[7px]" />
                <Bar h={34} className="rounded-[7px]" />
              </div>
            ))}
          </div>
        </div>
      </BodySkeleton>
    </AppScreen>
  );
}
