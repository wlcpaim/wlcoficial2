import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/lib/data";

export function ProjectFilter({ value, onChange, allowAll = true }: { value: string; onChange: (v: string) => void; allowAll?: boolean }) {
  const { data } = useProjects();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full sm:w-60"><SelectValue placeholder="Projeto" /></SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">Todos os projetos</SelectItem>}
        {data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
