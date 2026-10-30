import type { ComponentType } from "react";
import type { IconBaseProps } from "react-icons";

interface DataIconProps {
  icon: ComponentType<IconBaseProps>;
  className?: string;
}

export function DataIcon({ icon: Icon, className }: DataIconProps) {
  return (
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-lg bg-primary-200 ${className ?? ""}`}
    >
      <Icon className="w-5 h-5 text-primary-600" />
    </div>
  );
}
