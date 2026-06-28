import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>待开发模块</CardTitle>
          <CardDescription>主链路跑通后按优先级接入真实接口。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="rounded-lg border p-4 text-sm">
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
