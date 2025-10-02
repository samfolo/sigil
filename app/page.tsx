import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-background p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Data Input</h2>
          <Textarea
            placeholder="Paste your data here..."
            className="min-h-[400px] font-mono text-sm"
          />
        </div>
        <Separator />
        <Button>Analyze</Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-6">
        <Card className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Canvas placeholder</p>
        </Card>
      </div>
    </div>
  );
}
