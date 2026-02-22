import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md bg-muted/60 animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]", className)} {...props} />;
}

export { Skeleton };
