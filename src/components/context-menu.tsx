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
  useCallback,
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
    start += 1;
  }

  // Find last non-separator item
  let end = items.length - 1;
  while (end >= 0 && items[end]?.separator) {
    end -= 1;
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

function hideBrokenImage(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = "none";
}

interface ContextMenuSubmenuProps {
  activeIndex: number;
  itemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  items: ContextMenuItem[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => void;
  onSelect: (event: React.MouseEvent<HTMLElement>, item: ContextMenuItem) => void;
  position: { left: number; top: number };
}

function ContextMenuSubmenu({
  items,
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
        {items.map((child, index) => (
          <ContextMenuSubmenuItem
            active={index === activeIndex}
            child={child}
            index={index}
            itemRefs={itemRefs}
            key={child.id}
            onKeyDown={onKeyDown}
            onSelect={onSelect}
          />
        ))}
      </div>
    </FloatingPortal>
  );
}

interface ContextMenuSubmenuItemProps {
  active: boolean;
  child: ContextMenuItem;
  index: number;
  itemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  onKeyDown: ContextMenuSubmenuProps["onKeyDown"];
  onSelect: ContextMenuSubmenuProps["onSelect"];
}

function ContextMenuSubmenuItem({
  active,
  child,
  index,
  itemRefs,
  onKeyDown,
  onSelect,
}: ContextMenuSubmenuItemProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => onSelect(event, child),
    [child, onSelect],
  );
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, index),
    [index, onKeyDown],
  );
  const setItemRef = useCallback(
    (node: HTMLButtonElement | null) => {
      itemRefs.current[index] = node;
    },
    [index, itemRefs],
  );

  const Icon = child.icon;

  return (
    <button
      className={clsx(
        "group flex w-full items-center justify-between rounded-sm px-2 py-1.5",
        "text-sm transition-colors duration-75 enabled:cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "text-gray-700 enabled:hover:bg-gray-100 enabled:hover:text-gray-900 dark:text-gray-200 enabled:dark:hover:bg-gray-700 enabled:dark:hover:text-white",
        child.disabled ? "!opacity-75 !cursor-not-allowed" : undefined,
      )}
      disabled={child.disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={setItemRef}
      role="menuitem"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      <div className="flex w-full items-center gap-x-2">
        {Icon ? (
          <Icon aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
        ) : null}
        <span className="truncate">{child.label}</span>
      </div>
    </button>
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
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
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

type MenuItemPropsGetter = ReturnType<typeof useInteractions>["getItemProps"];

interface ContextMenuItemContentProps {
  hasChildren: boolean;
  item: ContextMenuItem;
}

function ContextMenuItemContent({
  hasChildren,
  item,
}: ContextMenuItemContentProps) {
  const Icon = item.icon;
  const favicon =
    item.favicon && item.href ? (
      <Image
        alt=""
        aria-hidden="true"
        className="h-4 w-4 flex-shrink-0 rounded-sm"
        decoding="async"
        height={16}
        loading="lazy"
        onError={hideBrokenImage}
        src={item.favicon}
        unoptimized
        width={16}
      />
    ) : null;
  const leadingIcon =
    Icon && !item.href ? (
      <Icon
        aria-hidden="true"
        className={twMerge("h-4 w-4 flex-shrink-0", item.iconClassName)}
      />
    ) : null;
  const trailingIcon =
    Icon && item.href ? (
      <Icon
        aria-hidden="true"
        className={twMerge("h-4 w-4 flex-shrink-0", item.iconClassName)}
      />
    ) : null;

  return (
    <div className="flex w-full items-center gap-x-2">
      {leadingIcon}
      <div className="flex min-w-0 items-center gap-x-2">
        {favicon}
        <span className="truncate">{item.label}</span>
      </div>
      <div className="ml-auto flex items-center gap-x-2">
        {item.shortcut ? (
          <span className="text-xs opacity-60">{item.shortcut}</span>
        ) : null}
        {trailingIcon}
        {hasChildren ? (
          <ChevronRight aria-hidden="true" className="h-4 w-4 opacity-60" />
        ) : null}
      </div>
    </div>
  );
}

function ContextMenuItemTooltip({
  children,
  tooltip,
}: Pick<ContextMenuItem, "tooltip"> & {
  children: React.ReactElement;
}): React.ReactElement {
  return tooltip ? (
    <CursorTooltip content={tooltip} delay={500} placement="right">
      {children}
    </CursorTooltip>
  ) : (
    children
  );
}

interface ContextMenuSubmenuControllerProps {
  activeIndex: number;
  closeMenu: () => void;
  closeSubmenu: () => void;
  itemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  items: ContextMenuItem[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  parentIndex: number;
  parentItemRef: React.RefObject<Array<HTMLElement | null>>;
  position: { left: number; top: number };
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}

function ContextMenuSubmenuController({
  activeIndex,
  items,
  closeMenu,
  closeSubmenu,
  itemRefs,
  menuRef,
  parentIndex,
  parentItemRef,
  position,
  setActiveIndex,
}: ContextMenuSubmenuControllerProps) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, childIndex: number) => {
      const enabledItems = items.filter((child) => !child.disabled);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (enabledItems.length === 0) {
          return;
        }

        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const currentEnabledIndex = enabledItems.findIndex(
          (child) => child.id === items[childIndex]?.id,
        );
        const nextChild =
          enabledItems[
            (currentEnabledIndex + direction + enabledItems.length) %
              enabledItems.length
          ];
        const nextIndex = items.findIndex(
          (child) => child.id === nextChild?.id,
        );
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "Escape") {
        event.preventDefault();
        closeSubmenu();
        parentItemRef.current[parentIndex]?.focus();
      }
    },
    [items, closeSubmenu, itemRefs, parentIndex, parentItemRef, setActiveIndex],
  );
  const handleSelect = useCallback(
    (event: React.MouseEvent<HTMLElement>, child: ContextMenuItem) => {
      event.preventDefault();
      event.stopPropagation();
      if (child.disabled) {
        return;
      }

      child.onClick?.(event);
      closeMenu();
    },
    [closeMenu],
  );

  return (
    <ContextMenuSubmenu
      activeIndex={activeIndex}
      itemRefs={itemRefs}
      items={items}
      menuRef={menuRef}
      onClose={closeSubmenu}
      onKeyDown={handleKeyDown}
      onSelect={handleSelect}
      position={position}
    />
  );
}

interface ContextMenuItemRendererProps {
  activeIndex: number | null;
  activeSubmenuIndex: number;
  closeMenu: () => void;
  closeSubmenu: () => void;
  getItemProps: MenuItemPropsGetter;
  item: ContextMenuItem;
  itemIndex: number;
  listRef: React.RefObject<Array<HTMLElement | null>>;
  openSubmenuForIndex: (index: number) => void;
  openSubmenuIndex: number | null;
  setActiveSubmenuIndex: React.Dispatch<React.SetStateAction<number>>;
  submenuItemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  submenuPosition: { left: number; top: number };
  submenuRef: React.RefObject<HTMLDivElement | null>;
}

function ContextMenuItemRenderer({
  activeIndex,
  activeSubmenuIndex,
  closeMenu,
  closeSubmenu,
  getItemProps,
  item,
  itemIndex,
  listRef,
  openSubmenuForIndex,
  openSubmenuIndex,
  setActiveSubmenuIndex,
  submenuItemRefs,
  submenuPosition,
  submenuRef,
}: ContextMenuItemRendererProps) {
  const isNavigable = !(item.disabled || item.visualOnly);
  const isActive = activeIndex === itemIndex;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const classes = clsx(
    "group flex w-full items-center justify-between rounded-sm px-2 py-1.5",
    "text-sm transition-colors duration-75 enabled:cursor-pointer",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
    item.visualOnly
      ? "cursor-default text-gray-500 dark:text-gray-400"
      : getContextMenuItemVariantClasses(item.variant, isActive),
    item.disabled ? "!opacity-75 !cursor-not-allowed" : undefined,
  );
  const setItemRef = useCallback(
    (node: HTMLElement | null) => {
      if (isNavigable) {
        listRef.current[itemIndex] = node;
      }
    },
    [isNavigable, itemIndex, listRef],
  );
  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (item.disabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      item.onClick?.(event);
      closeMenu();
    },
    [closeMenu, item],
  );
  const handleButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (item.disabled || hasChildren) {
        return;
      }

      item.onClick?.(event);
      closeMenu();
    },
    [closeMenu, hasChildren, item],
  );
  const handleButtonKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        !hasChildren ||
        (event.key !== "ArrowRight" &&
          event.key !== "Enter" &&
          event.key !== " ")
      ) {
        return;
      }

      const firstEnabledChildIndex = item.children?.findIndex(
        (child) => !child.disabled,
      );
      if (
        firstEnabledChildIndex === undefined ||
        firstEnabledChildIndex === -1
      ) {
        return;
      }

      event.preventDefault();
      openSubmenuForIndex(itemIndex);
      setActiveSubmenuIndex(firstEnabledChildIndex);
      requestAnimationFrame(() => {
        submenuItemRefs.current[firstEnabledChildIndex]?.focus();
      });
    },
    [
      hasChildren,
      item.children,
      itemIndex,
      openSubmenuForIndex,
      setActiveSubmenuIndex,
      submenuItemRefs,
    ],
  );
  const handleMouseEnter = useCallback(() => {
    if (hasChildren) {
      openSubmenuForIndex(itemIndex);
      return;
    }

    closeSubmenu();
  }, [closeSubmenu, hasChildren, itemIndex, openSubmenuForIndex]);

  if (item.separator) {
    return <hr className="my-1 h-px border-0 bg-gray-300 dark:bg-gray-600" />;
  }

  const content = (
    <ContextMenuItemContent hasChildren={hasChildren} item={item} />
  );
  const submenu =
    hasChildren && openSubmenuIndex === itemIndex ? (
      <ContextMenuSubmenuController
        activeIndex={activeSubmenuIndex}
        items={item.children ?? []}
        closeMenu={closeMenu}
        closeSubmenu={closeSubmenu}
        itemRefs={submenuItemRefs}
        menuRef={submenuRef}
        parentIndex={itemIndex}
        parentItemRef={listRef}
        position={submenuPosition}
        setActiveIndex={setActiveSubmenuIndex}
      />
    ) : null;

  if (item.href) {
    const link = (
      <a
        aria-disabled={item.disabled || undefined}
        className={classes}
        href={item.href}
        ref={setItemRef}
        role="menuitem"
        tabIndex={isActive ? 0 : -1}
        target={item.target}
        {...getItemProps({ onClick: handleLinkClick })}
      >
        {content}
      </a>
    );
    return (
      <ContextMenuItemTooltip tooltip={item.tooltip}>
        {link}
      </ContextMenuItemTooltip>
    );
  }

  const control = item.visualOnly ? (
    <div className={classes} role="presentation">
      {content}
    </div>
  ) : (
    <button
      aria-expanded={hasChildren ? openSubmenuIndex === itemIndex : undefined}
      aria-haspopup={hasChildren ? "menu" : undefined}
      className={classes}
      disabled={item.disabled}
      ref={setItemRef}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      {...getItemProps({
        onClick: handleButtonClick,
        onKeyDown: handleButtonKeyDown,
        onMouseEnter: handleMouseEnter,
      })}
    >
      {content}
    </button>
  );
  const menuItem = (
    <div className="relative">
      {control}
      {submenu}
    </div>
  );

  return (
    <ContextMenuItemTooltip tooltip={item.tooltip}>
      {menuItem}
    </ContextMenuItemTooltip>
  );
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
  const menuElementRef = useRef<HTMLDivElement | null>(null);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(0);
  const [submenuPosition, setSubmenuPosition] = useState({ left: 0, top: 0 });
  const submenuRef = useRef<HTMLDivElement | null>(null);
  const submenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const isOpenRef = useRef(isOpen);

  const handleClose = useCallback(() => {
    if (isOpenRef.current) {
      window.dispatchEvent(new Event("context-menu-close"));
    }
    isOpenRef.current = false;
    closeMenu();

    const menuElement = menuElementRef.current;
    menuElement?.classList.remove("tooltip-enter");
    menuElement?.classList.add("tooltip-exit");

    setTimeout(() => {
      hideMenu();
    }, 50);
  }, [closeMenu, hideMenu]);

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
    const pageIsVisible = document.visibilityState === "visible";
    const isFocused = document.hasFocus();

    if (!(pageIsVisible && isFocused) && isOpen) {
      handleClose();
    }
  });

  const handleScroll = useEffectEvent(() => {
    if (isOpen) {
      handleClose();
    }
  });

  const handleActiveContextMenu = useEffectEvent((event: MouseEvent) => {
    const { target } = event;
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

  const openSubmenuForIndex = useCallback((validIndex: number) => {
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
  }, []);

  const closeSubmenu = useCallback(() => setOpenSubmenuIndex(null), []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
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
        const menuElement = menuElementRef.current;
        menuElement?.classList.remove("tooltip-exit");
        menuElement?.classList.add("tooltip-enter");
      });
    },
    [disabled, openMenu],
  );
  const setReferenceRef = useCallback(
    (node: HTMLElement | null) => {
      refs.setReference(node);
    },
    [refs],
  );
  const setFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
      menuElementRef.current = node;
    },
    [refs],
  );

  const visibleItems = filterEdgeSeparators(items);
  const navigableItems = visibleItems.filter(
    (item) => !(item.separator || item.disabled || item.visualOnly),
  );

  return (
    <>
      {/* Custom trigger element */}
      {isValidElement(children) &&
        cloneElement(children, {
          "data-context-menu-trigger": disabled ? undefined : triggerId,
          onContextMenu: handleContextMenu,
          ref: setReferenceRef,
        } as React.HTMLAttributes<HTMLElement>)}

      {/* Render popover in portal when visible */}
      {isVisible ? (
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
              ref={setFloatingRef}
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
              {visibleItems.map((item) => {
                const itemIndex = navigableItems.findIndex(
                  (navigableItem) => navigableItem.id === item.id,
                );
                return (
                  <ContextMenuItemRenderer
                    activeIndex={activeIndex}
                    activeSubmenuIndex={activeSubmenuIndex}
                    closeMenu={handleClose}
                    closeSubmenu={closeSubmenu}
                    getItemProps={getItemProps}
                    item={item}
                    itemIndex={itemIndex}
                    key={item.id}
                    listRef={listRef}
                    openSubmenuForIndex={openSubmenuForIndex}
                    openSubmenuIndex={openSubmenuIndex}
                    setActiveSubmenuIndex={setActiveSubmenuIndex}
                    submenuItemRefs={submenuItemRefs}
                    submenuPosition={submenuPosition}
                    submenuRef={submenuRef}
                  />
                );
              })}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  );
}

export default function DefaultContextMenu(props: ContextMenuProps) {
  return <ContextMenu {...props} />;
}
