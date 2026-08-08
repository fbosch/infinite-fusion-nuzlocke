import { Hand, Home, MousePointer } from "lucide-react";
import type { TypeName } from "@/lib/typings";
import TypePills from "../TypePills";

interface DraggableSpriteTooltipContentProps {
  originalLocationName: string | null;
  primary?: TypeName;
  secondary?: TypeName;
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
      <div className="mb-1.5 flex py-0.5 text-xs">
        <TypePills className="flex" primary={primary} secondary={secondary} />
      </div>
      <div className="my-1.5 mb-2 h-px w-full bg-gray-200 dark:bg-gray-700" />
      {originalLocationName ? (
        <div className="mb-2 border-gray-200 border-b pb-2 dark:border-gray-700">
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
      <div className="flex items-center gap-2 text-xs">
        {showGrabHint ? (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <Hand className="size-2.5" />
              <span className="font-medium text-xs">L</span>
            </div>
            <span className="text-gray-600 text-xs dark:text-gray-300">
              Grab
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-50 px-1 py-px text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <MousePointer className="size-2.5" />
            <span className="font-medium text-xs">R</span>
          </div>
          <span className="text-gray-600 text-xs dark:text-gray-300">
            Options
          </span>
        </div>
      </div>
    </div>
  );
}
