"use client";

import { Bug, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  type AnalyticsDebugCounters,
  getAnalyticsDebugCounters,
  resetAnalyticsDebugCounters,
} from "@/lib/analytics/trackEvent";

const DEBUG_QUERY_KEY = "analytics_debug";
const DEBUG_STORAGE_KEY = "analytics-debug-panel";

const subscribeToPanelEnabled = () => () => {};
const getServerPanelEnabledSnapshot = () => false;

function isDebugQueryEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(DEBUG_QUERY_KEY) === "1";
}

function isPanelEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (isDebugQueryEnabled()) {
    return true;
  }

  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AnalyticsDebugPanel() {
  const enabled = useSyncExternalStore(
    subscribeToPanelEnabled,
    isPanelEnabled,
    getServerPanelEnabledSnapshot,
  );
  const [open, setOpen] = useState(true);
  const [counters, setCounters] = useState<AnalyticsDebugCounters>(
    getAnalyticsDebugCounters,
  );

  useEffect(() => {
    if (!isDebugQueryEnabled()) {
      return;
    }

    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, "1");
    } catch {
      // Ignore localStorage write failures.
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setCounters(getAnalyticsDebugCounters());
    const intervalId = window.setInterval(() => {
      setCounters(getAnalyticsDebugCounters());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  const consentIsOnlyBlocker = useMemo(() => {
    const { blockReasons } = counters;
    const hasConsentBlocks = blockReasons.no_consent > 0;
    const hasOtherBlockers =
      blockReasons.non_browser > 0 ||
      blockReasons.non_production > 0 ||
      blockReasons.kill_switch > 0 ||
      blockReasons.invalid_payload > 0 ||
      blockReasons.track_error > 0;

    return hasConsentBlocks && !hasOtherBlockers;
  }, [counters]);

  if (!enabled) {
    return null;
  }

  if (!open) {
    return (
      <button
        aria-label="Open analytics debug panel"
        className="fixed right-4 bottom-4 z-[60] inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 font-medium text-amber-900 text-xs shadow-sm"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Bug aria-hidden="true" className="h-4 w-4" />
        Analytics Debug
      </button>
    );
  }

  return (
    <section
      aria-label="Analytics debug panel"
      className="fixed right-4 bottom-4 z-[60] w-[22rem] rounded-lg border border-gray-300 bg-white p-3 text-gray-900 text-xs shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 font-semibold">
          <Bug aria-hidden="true" className="h-4 w-4" />
          Analytics Debug
        </div>
        <div className="inline-flex items-center gap-1">
          <button
            aria-label="Reset analytics counters"
            className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
            onClick={() => {
              resetAnalyticsDebugCounters();
              setCounters(getAnalyticsDebugCounters());
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Collapse analytics debug panel"
            className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-gray-200 p-2">
          sent: {counters.sent}
        </div>
        <div className="rounded border border-gray-200 p-2">
          blocked: {counters.blocked}
        </div>
      </div>

      <div className="mt-2 rounded border border-gray-200 p-2">
        <div className="mb-1 font-medium">blocked reasons</div>
        <pre className="whitespace-pre-wrap break-words text-[11px]">
          {JSON.stringify(counters.blockReasons, null, 2)}
        </pre>
      </div>

      <div className="mt-2 rounded border border-gray-200 p-2">
        <div className="mb-1 font-medium">events</div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px]">
          {JSON.stringify(counters.byEvent, null, 2)}
        </pre>
      </div>

      <p className="mt-2 text-[11px] text-gray-700">
        {consentIsOnlyBlocker
          ? "Events are currently blocked only by consent; with analytics consent enabled, matching events should send."
          : "If blockers other than no_consent are non-zero, consent alone will not guarantee event delivery."}
      </p>
      <p className="mt-1 text-[11px] text-gray-500">
        Enable with <code>?analytics_debug=1</code>.
      </p>
    </section>
  );
}
