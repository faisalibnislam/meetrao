import { AppScreen } from "@/components/app/app-screen";
import { Bar } from "@/components/app/skeleton";
import { Card } from "@/components/ui/panels";

/* Analytics is the slowest admin screen — eight aggregate queries, in parallel
   but still a round trip to Tokyo — and it is reached by a sidebar click, which
   is exactly the case a missing loading boundary makes feel broken: Next skips
   prefetching a dynamic route that has none, so nothing paints until the whole
   response lands. The real title and the real tab row are here so only the
   numbers arrive late. */
export default function Loading() {
  return (
    <AppScreen title="Analytics" subtitle="Who visits meetrao.com, and on what.">
      <div className="flex flex-col gap-[22px]">
        <div className="flex gap-[18px] border-b border-line pb-[10px]">
          {[7, 30, 90].map((days) => (
            <Bar key={days} w={54} h={13} />
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] overflow-hidden rounded-[8px] border border-line bg-surface">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-[8px] px-[15px] py-[15px]">
              <Bar w={56} h={18} />
              <Bar w={72} h={9} />
            </div>
          ))}
        </div>

        <Card className="px-[12px] py-[14px]">
          <Bar w="100%" h={164} />
        </Card>

        <div className="grid grid-cols-2 gap-[18px] max-[820px]:grid-cols-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-[9px]">
              <Bar w={104} h={14} />
              <Card>
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-[12px] px-[15px] py-[11px]">
                    <Bar w={`${34 + ((row * 19) % 34)}%`} h={12} />
                    <span className="flex-1" />
                    <Bar w={26} h={12} className="flex-none" />
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      </div>
    </AppScreen>
  );
}
