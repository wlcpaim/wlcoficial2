import { Check } from "lucide-react";
import { PROJECT_PRESETS, type ProjectPresetId } from "@/lib/project-presets";
import { cn } from "@/lib/utils";

export function PresetPicker({ value, onChange, disabled }: { value: ProjectPresetId; onChange: (v: ProjectPresetId) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Preset do projeto">
      {PROJECT_PRESETS.map((p) => {
        const on = p.id === value;
        return (
          <button key={p.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(p.id)}
            className={cn("flex min-h-14 items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50", on && "border-primary bg-primary/10")}>
            <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>{on && <Check className="h-3 w-3" />}</span>
            <span className="min-w-0"><span className="block text-sm font-medium">{p.label}</span><span className="block text-xs text-muted-foreground">{p.summary}</span></span>
          </button>
        );
      })}
    </div>
  );
}
