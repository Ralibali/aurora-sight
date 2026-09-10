import { Badge } from "@/components/ui/badge";
import { CLASSIFICATION_HELP, CLASSIFICATION_LABELS, type Classification } from "@/lib/geo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FlaskConical, Radio } from "lucide-react";

const styles: Record<Classification, string> = {
  RECOMMENDED: "bg-rec text-rec-foreground border-transparent",
  CITED: "bg-cited text-cited-foreground border-transparent",
  MENTIONED: "bg-mentioned text-mentioned-foreground border-transparent",
  ABSENT: "bg-absent text-absent-foreground border-transparent",
};

export function ClassificationBadge({ value }: { value: Classification }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={styles[value]}>{CLASSIFICATION_LABELS[value]}</Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{CLASSIFICATION_HELP[value]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Demo- respektive live-märkning. Får aldrig utelämnas där data visas. */
export function ModeBadge({ mode }: { mode: string }) {
  if (mode === "live") {
    return (
      <Badge className="border-transparent bg-rec text-rec-foreground">
        <Radio className="mr-1 h-3 w-3" aria-hidden /> LIVE
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-demo text-demo-foreground">
      <FlaskConical className="mr-1 h-3 w-3" aria-hidden /> DEMO
    </Badge>
  );
}

export function DemoNotice() {
  return (
    <div className="rounded-lg border border-demo/50 bg-demo/15 px-4 py-3 text-sm">
      <span className="font-semibold">DEMO-data.</span> Detta är seedad exempeldata som visar hur
      gränssnittet fungerar. Det är inte riktiga modellsvar och får aldrig presenteras som en
      genomförd analys.
    </div>
  );
}
