import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function KpiCard({ title, value, hint, dotClassName, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="h-full border-border transition-colors hover:border-primary/35">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full bg-accent', dotClassName)} aria-hidden="true" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-foreground">{value}</div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </button>
  );
}
