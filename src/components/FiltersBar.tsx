import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FiltersBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  examType: string;
  onExamTypeChange: (v: string) => void;
}

export function FiltersBar({ search, onSearchChange, examType, onExamTypeChange }: FiltersBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl mx-auto">
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
  );
}
