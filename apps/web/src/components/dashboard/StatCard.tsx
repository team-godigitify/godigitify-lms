import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// Every card shares the same neutral surface — color lives only on the icon
// chip. Tinting the whole card per-variant (as this used to) turns a row of
// KPI tiles into a scattershot of unrelated pastels; a single shared surface
// with a colored accent reads as one system instead of seven.
const VARIANTS = {
  red:    { icon: "bg-red-100" },
  green:  { icon: "bg-green-100" },
  yellow: { icon: "bg-amber-100" },
  blue:   { icon: "bg-blue-100" },
  orange: { icon: "bg-orange-100" },
  indigo: { icon: "bg-indigo-100" },
} as const;

type ColorVariant = keyof typeof VARIANTS;

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon: React.ReactNode;
  colorVariant?: ColorVariant;
  loading?: boolean;
  href?: string;
  onClick?: () => void;
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  colorVariant = "blue",
  loading,
  href,
  onClick,
}: Props) {
  const router = useRouter();
  const variant = VARIANTS[colorVariant];
  const clickable = !!href || !!onClick;

  if (loading) {
    return (
      <div className="border border-surface-200 bg-white rounded-xl p-5 animate-pulse">
        <div className="h-3 w-24 bg-surface-100 rounded mb-3" />
        <div className="h-8 w-16 bg-surface-100 rounded mb-2" />
        <div className="h-3 w-32 bg-surface-100 rounded" />
      </div>
    );
  }

  return (
    <div
      onClick={href ? () => router.push(href) : onClick}
      className={cn(
        "border border-surface-200 bg-white rounded-xl p-5 transition-all",
        clickable && "cursor-pointer hover:shadow-md hover:scale-[1.01]",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", variant.icon)}>
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>

      {(subtitle || trend !== undefined) && (
        <div className="flex items-center gap-2">
          {trend !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-gray-400",
              )}
            >
              {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
              {Math.abs(trend)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
