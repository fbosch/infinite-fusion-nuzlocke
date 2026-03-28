import { Hand, Home, MousePointer } from "lucide-react";
import type { TypeName } from "@/lib/typings";
import TypePills from "../TypePills";

interface DraggableSpriteTooltipContentProps {
  primary?: TypeName;
  secondary?: TypeName;
  originalLocationName: string | null;
  showGrabHint: boolean;
}

export function DraggableSpriteTooltipContent({
  primary,
  secondary,
  originalLocationName,
  showGrabHint,
}: DraggableSpriteTooltipContentProps) {
  return (
    <div>
      <div className="flex py-0.5 text-xs mb-1.5">
        <TypePills className="flex" primary={primary} secondary={secondary} />
      </div>
      <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-1.5 mb-2" />
      {originalLocationName ? (
        <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs">
            <Home className="size-3 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              Encountered at:{" "}
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {originalLocationName}
            </span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center text-xs gap-2">
        {showGrabHint ? (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200">
              <Hand className="size-2.5" />
              <span className="font-medium text-xs">L</span>
            </div>
            <span className="text-gray-600 dark:text-gray-300 text-xs">
              Grab
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 px-1 py-px bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-200">
            <MousePointer className="size-2.5" />
            <span className="font-medium text-xs">R</span>
          </div>
          <span className="text-gray-600 dark:text-gray-300 text-xs">
            Options
          </span>
        </div>
      </div>
    </div>
  );
}
