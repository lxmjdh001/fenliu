import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function StatsPage() {
  return (
    <PlaceholderPage
      title="访问统计"
      description="查看 PV、UV、目标账号命中、国家、IP、UA 和 referer 明细。"
      items={["1 天 / 3 天 / 7 天筛选", "服务每日汇总", "目标账号每日汇总", "访问明细分页"]}
    />
  );
}
