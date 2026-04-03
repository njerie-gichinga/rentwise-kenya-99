import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import { generateMonthlyReport } from "@/lib/generateMonthlyReport";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MonthlyReportButton = () => {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateMonthlyReport(Number(month), Number(year));
      toast({ title: "Report downloaded", description: `${MONTHS[Number(month)]} ${year} report saved.` });
      setOpen(false);
    } catch (e: any) {
      console.error("Report generation error:", e);
      toast({ title: "Error generating report", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <FileDown className="mr-1.5 h-3.5 w-3.5" />
          Report
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Download Monthly Report</p>
          <div className="flex gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="w-full" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MonthlyReportButton;
