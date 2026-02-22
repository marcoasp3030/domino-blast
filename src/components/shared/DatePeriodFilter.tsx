import { useState } from "react";
import { subDays, startOfDay, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PeriodOption = "7d" | "30d" | "90d" | "custom" | "all";

interface DatePeriodFilterProps {
  onFilterChange: (from: Date | null, to: Date | null) => void;
}

export function DatePeriodFilter({ onFilterChange }: DatePeriodFilterProps) {
  const [selected, setSelected] = useState<PeriodOption>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const handleSelect = (option: PeriodOption) => {
    setSelected(option);
    if (option === "all") {
      onFilterChange(null, null);
    } else if (option === "custom") {
      // don't fire yet, wait for dates
    } else {
      const days = option === "7d" ? 7 : option === "30d" ? 30 : 90;
      onFilterChange(startOfDay(subDays(new Date(), days)), new Date());
    }
  };

  const applyCustom = (from?: Date, to?: Date) => {
    if (from) {
      onFilterChange(startOfDay(from), to ? new Date(to.getTime() + 86400000 - 1) : new Date());
    }
  };

  const periods: { label: string; value: PeriodOption }[] = [
    { label: "Tudo", value: "all" },
    { label: "7 dias", value: "7d" },
    { label: "30 dias", value: "30d" },
    { label: "90 dias", value: "90d" },
    { label: "Personalizado", value: "custom" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {periods.map((p) => (
        <Button
          key={p.value}
          variant={selected === p.value ? "default" : "outline"}
          size="sm"
          className="text-xs h-7 px-2.5"
          onClick={() => handleSelect(p.value)}
        >
          {p.label}
        </Button>
      ))}
      {selected === "custom" && (
        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs h-7 gap-1", !customFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {customFrom ? format(customFrom, "dd/MM/yy") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={(d) => { setCustomFrom(d); applyCustom(d, customTo); }}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs h-7 gap-1", !customTo && "text-muted-foreground")}>
                <CalendarIcon className="h-3 w-3" />
                {customTo ? format(customTo, "dd/MM/yy") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={(d) => { setCustomTo(d); applyCustom(customFrom, d); }}
                disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
