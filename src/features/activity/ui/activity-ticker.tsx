import { mockActivity } from "../model/mock";

export function ActivityTicker() {
  return (
    <div className="flex items-center gap-5 overflow-x-auto border-y-2 border-divider py-3.5">
      <span className="shrink-0 text-xs font-extrabold tracking-wide text-accent-500 uppercase">
        Recent
      </span>
      {mockActivity.map((item) => (
        <span
          key={item.text}
          className="border-r border-divider pr-5 text-sm whitespace-nowrap text-foreground/85 last:border-r-0"
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
