import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlaceholderPage({ title }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>{title}</CardTitle>
            <Badge variant="accent">Phase 11A</Badge>
          </div>
          <CardDescription>Placeholder page ready for data module integration.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed bg-white p-8 text-sm text-muted-foreground">
            This route is wired and protected. Business UI will be added in upcoming phases.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
