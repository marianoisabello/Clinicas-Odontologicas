import * as Icons from "lucide-react";
import { HelpCircle, type LucideIcon } from "lucide-react";

export function DynamicIcon({ name, className }: { name?: string | null; className?: string }) {
  const map = Icons as unknown as Record<string, LucideIcon>;
  const Icon: LucideIcon = (name && map[name]) || HelpCircle;
  return <Icon className={className} />;
}
