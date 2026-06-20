import { Search, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface FiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  examType: string;
  onExamTypeChange: (v: string) => void;
  showDiagnosis?: boolean;
  onShowDiagnosisChange?: (v: boolean) => void;
}

export function FiltersBar({ 
  search, 
  onSearchChange, 
  examType, 
  onExamTypeChange,
  showDiagnosis = false,
  onShowDiagnosisChange
}: FiltersBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-4xl mx-auto items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por ID ou texto..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={examType} onValueChange={onExamTypeChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card border-border">
            <SelectValue placeholder="Tipo de exame" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="RX">Raio-X</SelectItem>
            <SelectItem value="TC">Tomografia</SelectItem>
            <SelectItem value="RM">Ressonância</SelectItem>
            <SelectItem value="USG">Ultrassom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {onShowDiagnosisChange && (
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start bg-card px-4 py-2 rounded-xl border border-border/80 flex-shrink-0 select-none h-10 shadow-sm">
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            {showDiagnosis ? (
              <Eye className="w-3.5 h-3.5 text-primary" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            Mostrar Diagnósticos
          </span>
          <Switch
            checked={showDiagnosis}
            onCheckedChange={onShowDiagnosisChange}
            id="toggle-diagnosis"
          />
        </div>
      )}
    </div>
  );
}
