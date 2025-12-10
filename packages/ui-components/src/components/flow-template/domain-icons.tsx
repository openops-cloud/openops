import {
  AlertTriangle,
  FileBadge,
  Gauge,
  LucideIcon,
  PieChart,
  TrendingUp,
} from 'lucide-react';

export const DOMAIN_ICON_SUGGESTIONS: Record<string, LucideIcon> = {
  Allocation: PieChart,
  'Anomaly Management': AlertTriangle,
  'Rate Optimization': TrendingUp,
  'Workload Optimization': Gauge,
  'Policy & Governance': FileBadge,
};
