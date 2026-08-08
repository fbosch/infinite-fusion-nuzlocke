"use client";

import {
  FloatingFocusManager,
  FloatingPortal,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { clsx } from "clsx";
import { ChevronRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type React from "react";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { twMerge } from "tailwind-merge";
import { match } from "ts-pattern";
import { CursorTooltip } from "./CursorTooltip";

// Filter out separators at the beginning and end of the items array
const VIEWPORT_EDGE_PADDING = 8;

export function clampMenuPosition(
  position: { x: number; y: number },
  size: { width: number; height: number },
) {
  const maxX = Math.max(
    VIEWPORT_EDGE_PADDING,
    window.innerWidth - size.width - VIEWPORT_EDGE_PADDING,
  );
  const maxY = Math.max(
    VIEWPORT_EDGE_PADDING,
    window.innerHeight - size.height - VIEWPORT_EDGE_PADDING,
  );

  return {
    x: Math.min(Math.max(position.x, VIEWPORT_EDGE_PADDING), maxX),
    y: Math.min(Math.max(position.y, VIEWPORT_EDGE_PADDING), maxY),
  };
}

export function filterEdgeSeparators(
  items: ContextMenuItem[],
): ContextMenuItem[] {
  if (items.length === 0) {
    return items;
  }

  // Find first non-separator item
  let start = 0;
  while (start < items.length && items[start]?.separator) {
    start++;
  }

  // Find last non-separator item
  let end = items.length - 1;
  while (end >= 0 && items[end]?.separator) {
    end--;
  }

  // If no non-separator items found, return empty array
  if (start > end) {
    return [];
  }

  // Return slice from first to last non-separator item
  return items.slice(start, end + 1);
}

function getContextMenuItemVariantClasses(
  variant: ContextMenuItem["variant"],
  isActive: boolean,
) {
  return match<[ContextMenuItem["variant"], boolean]>([variant, isActive])
    .with(
      ["danger", true],
      () => "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
    )
    .with(
      ["danger", false],
      () =>
        "text-red-600 dark:text-red-400 enabled:hover:bg-red-50 enabled:dark:hover:bg-red-900/20 enabled:hover:text-red-700 enabled:dark:hover:text-red-300",
    )
    .with(
      ["warning", true],
      () =>
        "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300",
    )
    .with(
      ["warning", false],
      () =>
        "text-yellow-600 dark:text-yellow-400 enabled:hover:bg-yellow-50 enabled:dark:hover:bg-yellow-900/20 enabled:hover:text-yellow-700 enabled:dark:hover:text-yellow-300",
    )
    .otherwise(([, active]) =>
      active
        ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
        : "text-gray-700 dark:text-gray-200 enabled:hover:bg-gray-100 enabled:dark:hover:bg-gray-700 enabled:hover:text-gray-900 enabled:dark:hover:text-white",
    );
}

interface ContextMenuSubmenuProps {
  activeIndex: number;
  children: ContextMenuItem[];
  itemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => void;
  onSelect: (event: React.MouseEvent, item: ContextMenuItem) => void;
  position: { left: number; top: number };
}

function ContextMenuSubmenu({
  children,
  menuRef,
  onClose,
  onKeyDown,
  onSelect,
  activeIndex,
  itemRefs,
  position,
}: ContextMenuSubmenuProps) {
  return (
    <FloatingPortal>
      <div
        className={clsx(
          "z-[10000] rounded-md border border-gray-200 dark:border-gray-800",
          "bg-white shadow-black/5 shadow-xl dark:bg-gray-900/80 dark:shadow-black/25",
          "origin-top-left p-1 backdrop-blur-xl",
          "overflow-hidden",
        )}
        onMouseLeave={onClose}
        ref={menuRef}
        role="menu"
        style={{
          left: position.left,
          minWidth: "12rem",
          position: "fixed",
          top: position.top,
        }}
      >
        {children.map((child, index) => (
          <button
            className={clsx(
              "group flex w-full items-center justify-between rounded-sm px-2 py-1.5",
              "text-sm transition-colors duration-75 enabled:cursor-pointer",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "text-gray-700 enabled:hover:bg-gray-100 enabled:hover:text-gray-900 dark:text-gray-200 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white",
              child.disabled && "!opacity-75 !cursor-not-allowed",
            )}
            disabled={child.disabled}
            key={child.id}
            onClick={(event) => onSelect(event, child)}
            onKeyDown={(event) => onKeyDown(event, index)}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            role="menuitem"
            tabIndex={index === activeIndex ? 0 : -1}
            type="button"
          >
            <div className="flex w-full items-center gap-x-2">
              {child.icon && (
                <child.icon
                  aria-hidden="true"
                  className="h-4 w-4 flex-shrink-0"
                />
              )}
              <span className="truncate">{child.label}</span>
            </div>
          </button>
        ))}
      </div>
    </FloatingPortal>
  );
}

// Custom hook for context menu state management
function useContextMenuState() {
  const [, startTransition] = useTransition();
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openMenu = (position: { x: number; y: number }) => {
    startTransition(() => {
      setMenuPosition(position);
      setIsOpen(true);
      setIsVisible(true);
    });
  };

  const closeMenu = () => {
    startTransition(() => {
      setIsOpen(false);
    });
  };

  const hideMenu = () => {
    startTransition(() => {
      setIsVisible(false);
    });
  };

  return {
    activeIndex,
    closeMenu,
    hideMenu,
    isOpen,
    isVisible,
    menuPosition,
    openMenu,
    setActiveIndex,
    setMenuPosition,
  };
}

export interface ContextMenuItem {
  children?: ContextMenuItem[];
  disabled?: boolean;
  favicon?: string;
  href?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  id: string;
  label?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (event: React.MouseEvent<any>) => void;
  separator?: boolean;
  shortcut?: string;
  target?: string;
  tooltip?: React.ReactNode;
  variant?: "default" | "danger" | "warning";
  visualOnly?: boolean;
  // Remove customContent since we're using ReactNode for label now
}

export interface ContextMenuProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  items: ContextMenuItem[];
  portalRootId?: string;
}

export function ContextMenu({
  children,
  items,
  className,
  disabled = false,
  portalRootId = "context-menu-root",
}: ContextMenuProps) {
  const triggerId = useId();
  const {
    menuPosition,
    setMenuPosition,
    isOpen,
    isVisible,
    activeIndex,
    setActiveIndex,
    openMenu,
    closeMenu,
    hideMenu,
  } = useContextMenuState();

  const listRef = useRef<Array<HTMLElement | null>>([]);
  const menuElementRef = useRef<HTMLDivElement>(null);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(0);
  const [submenuPosition, setSubmenuPosition] = useState({ left: 0, top: 0 });
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isOpenRef = useRef(isOpen);

  const handleClose = () => {
    if (isOpenRef.current) {
      window.dispatchEvent(new Event("context-menu-close"));
    }
    isOpenRef.current = false;
    closeMenu();

    if (menuElementRef.current) {
      menuElementRef.current.classList.remove("tooltip-enter");
      menuElementRef.current.classList.add("tooltip-exit");

      setTimeout(() => {
        hideMenu();
      }, 50);
    }
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(
    () => () => {
      if (isOpenRef.current) {
        window.dispatchEvent(new Event("context-menu-close"));
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (!(isVisible && menuElementRef.current)) {
      return;
    }

    const { width, height } = menuElementRef.current.getBoundingClientRect();
    const nextPosition = clampMenuPosition(menuPosition, { height, width });

    if (
      nextPosition.x !== menuPosition.x ||
      nextPosition.y !== menuPosition.y
    ) {
      setMenuPosition(nextPosition);
    }
  }, [isVisible, menuPosition, setMenuPosition]);

  const handleVisibilityChange = useEffectEvent(() => {
    const isVisible = document.visibilityState === "visible";
    const isFocused = document.hasFocus();

    if (!(isVisible && isFocused) && isOpen) {
      handleClose();
    }
  });

  const handleScroll = useEffectEvent(() => {
    if (isOpen) {
      handleClose();
    }
  });

  const handleActiveContextMenu = useEffectEvent((event: MouseEvent) => {
    const target = event.target;
    const contextMenuTrigger =
      target instanceof Element &&
      target.closest<HTMLElement>("[data-context-menu-trigger]");

    if (!contextMenuTrigger) {
      event.preventDefault();
    } else if (contextMenuTrigger.dataset.contextMenuTrigger === triggerId) {
      event.preventDefault();
      event.stopPropagation();
    }

    handleClose();
  });

  // Floating UI setup for keyboard navigation
  const { refs, context } = useFloating({
    onOpenChange: (open) => {
      if (!open) {
        handleClose();
      }
    },
    open: isOpen,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const listNavigation = useListNavigation(context, {
    activeIndex,
    listRef,
    loop: true,
    onNavigate: setActiveIndex,
    selectedIndex: null,
  });

  const { getFloatingProps, getItemProps } = useInteractions([
    dismiss,
    role,
    listNavigation,
  ]);

  // Close menu when window becomes hidden, loses focus, or scrolls
  useEffect(() => {
    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    window.addEventListener("scroll", handleScroll, true); // Use capture phase to catch all scroll events

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("blur", handleVisibilityChange);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    document.addEventListener("contextmenu", handleActiveContextMenu, true);
    return () => {
      document.removeEventListener(
        "contextmenu",
        handleActiveContextMenu,
        true,
      );
    };
  }, [isVisible]);

  const openSubmenuForIndex = (validIndex: number) => {
    const trigger = listRef.current[validIndex];
    if (trigger) {
      const { bottom, right, top } = trigger.getBoundingClientRect();
      setSubmenuPosition({
        left: Math.min(right + 4, window.innerWidth - 200),
        top: Math.min(top, window.innerHeight - Math.max(bottom - top, 1)),
      });
    }
    setActiveSubmenuIndex(0);
    setOpenSubmenuIndex(validIndex);
  };

  const closeSubmenu = () => {
    setOpenSubmenuIndex(null);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isOpenRef.current = true;
    window.dispatchEvent(new Event("context-menu-open"));

    // Calculate position relative to the viewport
    const position = { x: event.clientX, y: event.clientY };
    openMenu(position);

    // Add enter animation class after a frame
    requestAnimationFrame(() => {
      if (menuElementRef.current) {
        menuElementRef.current.classList.remove("tooltip-exit");
        menuElementRef.current.classList.add("tooltip-enter");
      }
    });
  };

  const visibleItems = filterEdgeSeparators(items);
  const navigableItems = visibleItems.filter(
    (item) => !(item.separator || item.disabled || item.visualOnly),
  );

  return (
    <>
      {/* Custom trigger element */}
      {isValidElement(children) &&
        // react-doctor-disable-next-line react-hooks-js/refs -- Floating UI callback refs run during commit, not render.
        cloneElement(children, {
          "data-context-menu-trigger": disabled ? undefined : triggerId,
          onContextMenu: handleContextMenu,
          ref: (node: HTMLElement | null) => {
            refs.setReference(node);
          },
        } as React.HTMLAttributes<HTMLElement>)}

      {/* Render popover in portal when visible */}
      {isVisible && (
        <FloatingPortal id={portalRootId}>
          <FloatingFocusManager context={context} modal={false}>
            <div
              aria-orientation="vertical"
              className={clsx(
                "min-w-[12rem] rounded-md border border-gray-200 dark:border-gray-800",
                "max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto",
                "bg-white shadow-elevation-3 dark:bg-gray-900/80",
                "tooltip-enter p-1 backdrop-blur-xl",
                "origin-top-left backdrop-blur-xl",
                "focus:outline-none",
                "pointer-events-auto",
                className,
              )}
              ref={(node) => {
                refs.setFloating(node);
                menuElementRef.current = node;
              }}
              role="menu"
              style={{
                left: menuPosition.x,
                position: "fixed",
                top: menuPosition.y,
                transformOrigin: "top left",
                zIndex: 9999,
              }}
              {...getFloatingProps()}
            >
              {/* react-doctor-disable-next-line react-hooks-js/refs -- List refs are populated for commit-time Floating UI navigation. */}
              {visibleItems.map((item: ContextMenuItem, _index: number) => {
                if (item.separator) {
                  return (
                    <hr
                      className="my-1 h-px border-0 bg-gray-300 dark:bg-gray-600"
                      key={item.id}
                    />
                  );
                }

                const validIndex = navigableItems.findIndex(
                  (validItem) => validItem.id === item.id,
                );
                const isActive = activeIndex === validIndex;

                const baseClasses = clsx(
                  "group flex w-full items-center justify-between rounded-sm px-2 py-1.5",
                  "text-sm transition-colors duration-75 enabled:cursor-pointer",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                );

                const variantClasses = getContextMenuItemVariantClasses(
                  item.variant,
                  isActive,
                );

                const commonClasses = clsx(
                  baseClasses,
                  item.visualOnly
                    ? "cursor-default text-gray-500 dark:text-gray-400"
                    : variantClasses,
                  item.disabled && "!opacity-75 !cursor-not-allowed",
                );

                const hasChildren =
                  Array.isArray(item.children) && item.children.length > 0;
                const content = (
                  <div className="flex w-full items-center gap-x-2">
                    {item.icon && !item.href && (
                      <item.icon
                        aria-hidden="true"
                        className={twMerge(
                          "h-4 w-4 flex-shrink-0",
                          item.iconClassName,
                        )}
                      />
                    )}
                    <div className="flex min-w-0 items-center gap-x-2">
                      {item.favicon && item.href && (
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="h-4 w-4 flex-shrink-0 rounded-sm"
                          decoding="async"
                          height={16}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          src={item.favicon}
                          unoptimized
                          width={16}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {/* Right: shortcut and icon, always aligned to end */}
                    <div className="ml-auto flex items-center gap-x-2">
                      {item.shortcut && (
                        <span className="text-xs opacity-60">
                          {item.shortcut}
                        </span>
                      )}
                      {item.icon && item.href && (
                        <item.icon
                          aria-hidden="true"
                          className={twMerge(
                            "h-4 w-4 flex-shrink-0",
                            item.iconClassName,
                          )}
                        />
                      )}
                      {hasChildren && (
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 opacity-60"
                        />
                      )}
                    </div>
                  </div>
                );

                const submenu =
                  hasChildren && openSubmenuIndex === validIndex ? (
                    <ContextMenuSubmenu
                      activeIndex={activeSubmenuIndex}
                      itemRefs={submenuItemRefs}
                      menuRef={submenuRef}
                      onClose={closeSubmenu}
                      onKeyDown={(event, childIndex) => {
                        const enabledItems = item.children!.filter(
                          (child) => !child.disabled,
                        );
                        const moveFocus = (nextIndex: number) => {
                          setActiveSubmenuIndex(nextIndex);
                          submenuItemRefs.current[nextIndex]?.focus();
                        };

                        if (
                          event.key === "ArrowDown" ||
                          event.key === "ArrowUp"
                        ) {
                          if (enabledItems.length === 0) {
                            return;
                          }

                          event.preventDefault();
                          const direction = event.key === "ArrowDown" ? 1 : -1;
                          const currentEnabledIndex = enabledItems.findIndex(
                            (child) =>
                              child.id === item.children![childIndex]?.id,
                          );
                          const nextChild =
                            enabledItems[
                              (currentEnabledIndex +
                                direction +
                                enabledItems.length) %
                                enabledItems.length
                            ];
                          const nextIndex = item.children!.findIndex(
                            (child) => child.id === nextChild?.id,
                          );
                          moveFocus(nextIndex);
                        }

                        if (
                          event.key === "ArrowLeft" ||
                          event.key === "Escape"
                        ) {
                          event.preventDefault();
                          closeSubmenu();
                          listRef.current[validIndex]?.focus();
                        }
                      }}
                      onSelect={(event, child) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!child.disabled) {
                          child.onClick?.(event);
                          handleClose();
                        }
                      }}
                      position={submenuPosition}
                    >
                      {item.children!}
                    </ContextMenuSubmenu>
                  ) : null;

                // Render as link if href is provided
                if (item.href) {
                  const linkElement = (
                    <a
                      aria-disabled={item.disabled || undefined}
                      className={commonClasses}
                      href={item.href}
                      key={item.id}
                      ref={(node) => {
                        listRef.current[validIndex] = node;
                      }}
                      role="menuitem"
                      tabIndex={isActive ? 0 : -1}
                      target={item.target}
                      {...getItemProps({
                        onClick: (event) => {
                          if (item.disabled) {
                            event.preventDefault();
                            event.stopPropagation();
                            return;
                          }
                          item.onClick?.(event);
                          handleClose();
                        },
                      })}
                    >
                      {content}
                    </a>
                  );

                  // Wrap with tooltip if provided
                  if (item.tooltip) {
                    return (
                      <CursorTooltip
                        content={item.tooltip}
                        delay={500}
                        key={item.id}
                        placement="right"
                      >
                        {linkElement}
                      </CursorTooltip>
                    );
                  }

                  return linkElement;
                }

                // Render as button or visual-only element
                const buttonElement = item.visualOnly ? (
                  <div
                    className={commonClasses}
                    key={item.id}
                    role="presentation"
                    tabIndex={-1}
                  >
                    {content}
                  </div>
                ) : (
                  <button
                    className={commonClasses}
                    disabled={item.disabled}
                    key={item.id}
                    ref={(node) => {
                      listRef.current[validIndex] = node;
                    }}
                    role="menuitem"
                    tabIndex={isActive ? 0 : -1}
                    {...getItemProps({
                      onClick: (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!(item.disabled || hasChildren)) {
                          item.onClick?.(e);
                          handleClose();
                        }
                      },
                      onKeyDown: (event) => {
                        if (
                          hasChildren &&
                          (event.key === "ArrowRight" ||
                            event.key === "Enter" ||
                            event.key === " ")
                        ) {
                          event.preventDefault();
                          const firstEnabledChildIndex =
                            item.children!.findIndex(
                              (child) => !child.disabled,
                            );
                          if (firstEnabledChildIndex === -1) {
                            return;
                          }

                          openSubmenuForIndex(validIndex);
                          setActiveSubmenuIndex(firstEnabledChildIndex);
                          requestAnimationFrame(() => {
                            submenuItemRefs.current[
                              firstEnabledChildIndex
                            ]?.focus();
                          });
                        }
                      },
                      onMouseEnter: () => {
                        if (hasChildren) {
                          openSubmenuForIndex(validIndex);
                        } else {
                          closeSubmenu();
                        }
                      },
                    })}
                    aria-expanded={
                      hasChildren ? openSubmenuIndex === validIndex : undefined
                    }
                    aria-haspopup={hasChildren ? "menu" : undefined}
                  >
                    {content}
                  </button>
                );

                // Wrap with tooltip if provided
                if (item.tooltip) {
                  return (
                    <CursorTooltip
                      content={item.tooltip}
                      delay={500}
                      key={item.id}
                      placement="right"
                    >
                      <div className="relative">
                        {buttonElement}
                        {submenu}
                      </div>
                    </CursorTooltip>
                  );
                }

                return (
                  <div className="relative" key={item.id}>
                    {buttonElement}
                    {submenu}
                  </div>
                );
              })}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}

export default ContextMenu;
