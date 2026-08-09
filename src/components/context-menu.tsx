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
import { CursorTooltip } from "./cursor-tooltip";

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
  items: ContextMenuItem[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => void;
  onSelect: (
    event: React.MouseEvent<HTMLElement>,
    item: ContextMenuItem,
  ) => void;
  position: { left: number; top: number };
  setItemRef: (index: number, node: HTMLButtonElement | null) => void;
}

function ContextMenuSubmenu({
  items,
  menuRef,
  onClose,
  onKeyDown,
  onSelect,
  activeIndex,
  position,
  setItemRef,
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
            key={child.id}
            onKeyDown={onKeyDown}
            onSelect={onSelect}
            setItemRef={setItemRef}
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
  onKeyDown: ContextMenuSubmenuProps["onKeyDown"];
  onSelect: ContextMenuSubmenuProps["onSelect"];
  setItemRef: ContextMenuSubmenuProps["setItemRef"];
}

function ContextMenuSubmenuItem({
  active,
  child,
  index,
  onKeyDown,
  onSelect,
  setItemRef,
}: ContextMenuSubmenuItemProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => onSelect(event, child),
    [child, onSelect],
  );
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, index),
    [index, onKeyDown],
  );
  const registerItemRef = useCallback(
    (node: HTMLButtonElement | null) => setItemRef(index, node),
    [index, setItemRef],
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
      ref={registerItemRef}
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

function useMenuItemRefs() {
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const [listItems, setListItems] = useState<Array<HTMLElement | null>>([]);
  const submenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [submenuItems, setSubmenuItems] = useState<
    Array<HTMLButtonElement | null>
  >([]);

  useLayoutEffect(() => {
    listRef.current = listItems;
  }, [listItems]);

  useLayoutEffect(() => {
    submenuItemRefs.current = submenuItems;
  }, [submenuItems]);

  const registerListItem = useCallback(
    (index: number, node: HTMLElement | null) => {
      setListItems((currentItems) => {
        if (currentItems[index] === node) {
          return currentItems;
        }

        const nextItems = [...currentItems];
        nextItems[index] = node;
        return nextItems;
      });
    },
    [],
  );
  const registerSubmenuItem = useCallback(
    (index: number, node: HTMLButtonElement | null) => {
      setSubmenuItems((currentItems) => {
        if (currentItems[index] === node) {
          return currentItems;
        }

        const nextItems = [...currentItems];
        nextItems[index] = node;
        return nextItems;
      });
    },
    [],
  );

  return {
    listRef,
    registerListItem,
    registerSubmenuItem,
    submenuItemRefs,
  };
}

function useSubmenuState(listRef: React.RefObject<Array<HTMLElement | null>>) {
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState(0);
  const [submenuPosition, setSubmenuPosition] = useState({ left: 0, top: 0 });
  const submenuRef = useRef<HTMLDivElement | null>(null);

  const openSubmenuForIndex = useCallback(
    (validIndex: number) => {
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
    },
    [listRef],
  );
  const closeSubmenu = useCallback(() => setOpenSubmenuIndex(null), []);

  return {
    activeSubmenuIndex,
    closeSubmenu,
    openSubmenuForIndex,
    openSubmenuIndex,
    setActiveSubmenuIndex,
    submenuPosition,
    submenuRef,
  };
}

interface ContextMenuLifecycleOptions {
  closeMenu: () => void;
  hideMenu: () => void;
  isOpen: boolean;
  menuElementRef: React.RefObject<HTMLDivElement | null>;
}

function useContextMenuLifecycle({
  closeMenu,
  hideMenu,
  isOpen,
  menuElementRef,
}: ContextMenuLifecycleOptions) {
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
  }, [closeMenu, hideMenu, menuElementRef]);

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

  return { handleClose, isOpenRef };
}

interface ContextMenuCloseListenersOptions {
  handleClose: () => void;
  isOpen: boolean;
  isVisible: boolean;
  triggerId: string;
}

function useContextMenuCloseListeners({
  handleClose,
  isOpen,
  isVisible,
  triggerId,
}: ContextMenuCloseListenersOptions) {
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

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    window.addEventListener("scroll", handleScroll, true);

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
}

interface ContextMenuTriggerOptions {
  disabled: boolean;
  isOpenRef: React.RefObject<boolean>;
  menuElementRef: React.RefObject<HTMLDivElement | null>;
  openMenu: (position: { x: number; y: number }) => void;
}

function useContextMenuTrigger({
  disabled,
  isOpenRef,
  menuElementRef,
  openMenu,
}: ContextMenuTriggerOptions) {
  const [triggerWrapper, setTriggerWrapper] = useState<HTMLElement | null>(
    null,
  );
  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (disabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      isOpenRef.current = true;
      window.dispatchEvent(new Event("context-menu-open"));
      openMenu({ x: event.clientX, y: event.clientY });

      requestAnimationFrame(() => {
        const menuElement = menuElementRef.current;
        menuElement?.classList.remove("tooltip-exit");
        menuElement?.classList.add("tooltip-enter");
      });
    },
    [disabled, isOpenRef, menuElementRef, openMenu],
  );

  useEffect(() => {
    if (!triggerWrapper) {
      return;
    }

    triggerWrapper.addEventListener("contextmenu", handleContextMenu);
    return () => {
      triggerWrapper.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handleContextMenu, triggerWrapper]);

  return { setTriggerWrapper, triggerWrapper };
}

interface ClampedMenuPositionOptions {
  isVisible: boolean;
  menuElementRef: React.RefObject<HTMLDivElement | null>;
  menuPosition: { x: number; y: number };
  setMenuPosition: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
}

function useClampedMenuPosition({
  isVisible,
  menuElementRef,
  menuPosition,
  setMenuPosition,
}: ClampedMenuPositionOptions) {
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
  }, [isVisible, menuElementRef, menuPosition, setMenuPosition]);
}

interface ContextMenuFloatingOptions {
  activeIndex: number | null;
  handleClose: () => void;
  isOpen: boolean;
  listRef: React.RefObject<Array<HTMLElement | null>>;
  menuElementRef: React.RefObject<HTMLDivElement | null>;
  setActiveIndex: React.Dispatch<React.SetStateAction<number | null>>;
  triggerWrapper: HTMLElement | null;
}

function useContextMenuFloating({
  activeIndex,
  handleClose,
  isOpen,
  listRef,
  menuElementRef,
  setActiveIndex,
  triggerWrapper,
}: ContextMenuFloatingOptions) {
  const { refs, context } = useFloating({
    onOpenChange: (open) => {
      if (!open) {
        handleClose();
      }
    },
    open: isOpen,
  });

  useLayoutEffect(() => {
    const trigger = triggerWrapper?.firstElementChild;
    refs.setReference(trigger instanceof HTMLElement ? trigger : null);
  }, [refs, triggerWrapper]);

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
  const setFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      refs.setFloating(node);
      menuElementRef.current = node;
    },
    [menuElementRef, refs],
  );

  return { context, getFloatingProps, getItemProps, setFloatingRef };
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
  setItemRef: (index: number, node: HTMLButtonElement | null) => void;
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
  setItemRef,
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
      items={items}
      menuRef={menuRef}
      onClose={closeSubmenu}
      onKeyDown={handleKeyDown}
      onSelect={handleSelect}
      position={position}
      setItemRef={setItemRef}
    />
  );
}

interface ContextMenuItemRendererProps {
  activeIndex: number | null;
  item: ContextMenuItem;
  itemIndex: number;
  menu: {
    closeMenu: () => void;
    getItemProps: MenuItemPropsGetter;
    listRef: React.RefObject<Array<HTMLElement | null>>;
    setItemRef: (index: number, node: HTMLElement | null) => void;
  };
  submenu: {
    activeIndex: number;
    close: () => void;
    itemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
    menuRef: React.RefObject<HTMLDivElement | null>;
    openIndex: number | null;
    openForIndex: (index: number) => void;
    position: { left: number; top: number };
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
    setItemRef: (index: number, node: HTMLButtonElement | null) => void;
  };
}

interface ContextMenuItemControlProps {
  closeMenu: () => void;
  closeSubmenu: () => void;
  getItemProps: MenuItemPropsGetter;
  isActive: boolean;
  item: ContextMenuItem;
  itemIndex: number;
  openSubmenuForIndex: (index: number) => void;
  openSubmenuIndex: number | null;
  registerItemRef: (node: HTMLElement | null) => void;
  setActiveSubmenuIndex: React.Dispatch<React.SetStateAction<number>>;
  submenuItemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
}

function ContextMenuLinkItem({
  closeMenu,
  getItemProps,
  isActive,
  item,
  registerItemRef,
}: Pick<
  ContextMenuItemControlProps,
  "closeMenu" | "getItemProps" | "isActive" | "item" | "registerItemRef"
>) {
  const handleClick = useCallback(
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
  return (
    <a
      aria-disabled={item.disabled || undefined}
      className={getContextMenuItemClasses(item, isActive)}
      href={item.href}
      ref={registerItemRef}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      target={item.target}
      {...getItemProps({ onClick: handleClick })}
    >
      <ContextMenuItemContent hasChildren={false} item={item} />
    </a>
  );
}

function getContextMenuItemClasses(item: ContextMenuItem, isActive: boolean) {
  return clsx(
    "group flex w-full items-center justify-between rounded-sm px-2 py-1.5",
    "text-sm transition-colors duration-75 enabled:cursor-pointer",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
    item.visualOnly
      ? "cursor-default text-gray-500 dark:text-gray-400"
      : getContextMenuItemVariantClasses(item.variant, isActive),
    item.disabled ? "!opacity-75 !cursor-not-allowed" : undefined,
  );
}

function ContextMenuButtonItem({
  closeMenu,
  closeSubmenu,
  getItemProps,
  isActive,
  item,
  itemIndex,
  openSubmenuForIndex,
  openSubmenuIndex,
  registerItemRef,
  setActiveSubmenuIndex,
  submenuItemRefs,
}: ContextMenuItemControlProps) {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const handleClick = useCallback(
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
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const opensSubmenu =
        event.key === "ArrowRight" ||
        event.key === "Enter" ||
        event.key === " ";
      if (!(hasChildren && opensSubmenu)) {
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
  return (
    <button
      aria-expanded={hasChildren ? openSubmenuIndex === itemIndex : undefined}
      aria-haspopup={hasChildren ? "menu" : undefined}
      className={getContextMenuItemClasses(item, isActive)}
      disabled={item.disabled}
      ref={registerItemRef}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      {...getItemProps({
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        onMouseEnter: handleMouseEnter,
      })}
    >
      <ContextMenuItemContent hasChildren={hasChildren} item={item} />
    </button>
  );
}

interface ContextMenuItemRendererContentProps
  extends Pick<
    ContextMenuItemRendererProps,
    "item" | "itemIndex" | "menu" | "submenu"
  > {
  hasChildren: boolean;
  isActive: boolean;
  registerItemRef: (node: HTMLElement | null) => void;
}

function ContextMenuItemRendererContent({
  hasChildren,
  isActive,
  item,
  itemIndex,
  menu,
  registerItemRef,
  submenu,
}: ContextMenuItemRendererContentProps) {
  const { closeMenu, getItemProps, listRef } = menu;
  const {
    activeIndex: activeSubmenuIndex,
    close: closeSubmenu,
    itemRefs: submenuItemRefs,
    menuRef: submenuRef,
    openForIndex: openSubmenuForIndex,
    openIndex: openSubmenuIndex,
    position: submenuPosition,
    setActiveIndex: setActiveSubmenuIndex,
    setItemRef: setSubmenuItemRef,
  } = submenu;
  const submenuContent =
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
        setItemRef={setSubmenuItemRef}
      />
    ) : null;

  if (item.href) {
    return (
      <ContextMenuItemTooltip tooltip={item.tooltip}>
        <ContextMenuLinkItem
          closeMenu={closeMenu}
          getItemProps={getItemProps}
          isActive={isActive}
          item={item}
          registerItemRef={registerItemRef}
        />
      </ContextMenuItemTooltip>
    );
  }

  const control = item.visualOnly ? (
    <div
      className={getContextMenuItemClasses(item, isActive)}
      role="presentation"
    >
      <ContextMenuItemContent hasChildren={hasChildren} item={item} />
    </div>
  ) : (
    <ContextMenuButtonItem
      closeMenu={closeMenu}
      closeSubmenu={closeSubmenu}
      getItemProps={getItemProps}
      isActive={isActive}
      item={item}
      itemIndex={itemIndex}
      openSubmenuForIndex={openSubmenuForIndex}
      openSubmenuIndex={openSubmenuIndex}
      registerItemRef={registerItemRef}
      setActiveSubmenuIndex={setActiveSubmenuIndex}
      submenuItemRefs={submenuItemRefs}
    />
  );

  return (
    <ContextMenuItemTooltip tooltip={item.tooltip}>
      <div className="relative">
        {control}
        {submenuContent}
      </div>
    </ContextMenuItemTooltip>
  );
}

function ContextMenuItemRenderer({
  activeIndex,
  item,
  itemIndex,
  menu,
  submenu,
}: ContextMenuItemRendererProps) {
  const { setItemRef } = menu;
  const isNavigable = !(item.disabled || item.visualOnly);
  const isActive = activeIndex === itemIndex;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const registerItemRef = useCallback(
    (node: HTMLElement | null) => {
      if (isNavigable) {
        setItemRef(itemIndex, node);
      }
    },
    [isNavigable, itemIndex, setItemRef],
  );
  if (item.separator) {
    return <hr className="my-1 h-px border-0 bg-gray-300 dark:bg-gray-600" />;
  }

  return (
    <ContextMenuItemRendererContent
      hasChildren={hasChildren}
      isActive={isActive}
      item={item}
      itemIndex={itemIndex}
      menu={menu}
      registerItemRef={registerItemRef}
      submenu={submenu}
    />
  );
}

type FloatingPropsGetter = ReturnType<
  typeof useInteractions
>["getFloatingProps"];

interface ContextMenuTriggerProps {
  children: React.ReactNode;
  disabled: boolean;
  setTriggerWrapper: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  triggerId: string;
}

function ContextMenuTrigger({
  children,
  disabled,
  setTriggerWrapper,
  triggerId,
}: ContextMenuTriggerProps) {
  if (!isValidElement(children)) {
    return children;
  }

  return (
    <span
      className="contents"
      data-context-menu-trigger={disabled ? undefined : triggerId}
      ref={setTriggerWrapper}
    >
      {children}
    </span>
  );
}

interface ContextMenuPanelProps {
  activeIndex: number | null;
  className?: string;
  context: ReturnType<typeof useFloating>["context"];
  getFloatingProps: FloatingPropsGetter;
  items: ContextMenuItem[];
  menu: ContextMenuItemRendererProps["menu"];
  menuPosition: { x: number; y: number };
  portalRootId: string;
  setFloatingRef: (node: HTMLDivElement | null) => void;
  submenu: ContextMenuItemRendererProps["submenu"];
  visible: boolean;
}

function ContextMenuPanel({
  activeIndex,
  className,
  context,
  getFloatingProps,
  items,
  menu,
  menuPosition,
  portalRootId,
  setFloatingRef,
  submenu,
  visible,
}: ContextMenuPanelProps) {
  if (!visible) {
    return null;
  }

  const visibleItems = filterEdgeSeparators(items);
  const navigableItems = visibleItems.filter(
    (item) => !(item.separator || item.disabled || item.visualOnly),
  );

  return (
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
                item={item}
                itemIndex={itemIndex}
                key={item.id}
                menu={menu}
                submenu={submenu}
              />
            );
          })}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}

interface ContextMenuRendererPropsOptions {
  activeSubmenuIndex: number;
  closeMenu: () => void;
  closeSubmenu: () => void;
  getItemProps: MenuItemPropsGetter;
  listRef: React.RefObject<Array<HTMLElement | null>>;
  openSubmenuForIndex: (index: number) => void;
  openSubmenuIndex: number | null;
  registerListItem: (index: number, node: HTMLElement | null) => void;
  registerSubmenuItem: (index: number, node: HTMLButtonElement | null) => void;
  setActiveSubmenuIndex: React.Dispatch<React.SetStateAction<number>>;
  submenuItemRefs: React.RefObject<Array<HTMLButtonElement | null>>;
  submenuPosition: { left: number; top: number };
  submenuRef: React.RefObject<HTMLDivElement | null>;
}

function createContextMenuRendererProps({
  activeSubmenuIndex,
  closeMenu,
  closeSubmenu,
  getItemProps,
  listRef,
  openSubmenuForIndex,
  openSubmenuIndex,
  registerListItem,
  registerSubmenuItem,
  setActiveSubmenuIndex,
  submenuItemRefs,
  submenuPosition,
  submenuRef,
}: ContextMenuRendererPropsOptions) {
  return {
    menu: {
      closeMenu,
      getItemProps,
      listRef,
      setItemRef: registerListItem,
    },
    submenu: {
      activeIndex: activeSubmenuIndex,
      close: closeSubmenu,
      itemRefs: submenuItemRefs,
      menuRef: submenuRef,
      openForIndex: openSubmenuForIndex,
      openIndex: openSubmenuIndex,
      position: submenuPosition,
      setActiveIndex: setActiveSubmenuIndex,
      setItemRef: registerSubmenuItem,
    },
  };
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

  const menuElementRef = useRef<HTMLDivElement | null>(null);
  const { listRef, registerListItem, registerSubmenuItem, submenuItemRefs } =
    useMenuItemRefs();
  const {
    activeSubmenuIndex,
    closeSubmenu,
    openSubmenuForIndex,
    openSubmenuIndex,
    setActiveSubmenuIndex,
    submenuPosition,
    submenuRef,
  } = useSubmenuState(listRef);
  const { handleClose, isOpenRef } = useContextMenuLifecycle({
    closeMenu,
    hideMenu,
    isOpen,
    menuElementRef,
  });

  useContextMenuCloseListeners({
    handleClose,
    isOpen,
    isVisible,
    triggerId,
  });
  const { setTriggerWrapper, triggerWrapper } = useContextMenuTrigger({
    disabled,
    isOpenRef,
    menuElementRef,
    openMenu,
  });

  useClampedMenuPosition({
    isVisible,
    menuElementRef,
    menuPosition,
    setMenuPosition,
  });

  const { context, getFloatingProps, getItemProps, setFloatingRef } =
    useContextMenuFloating({
      activeIndex,
      handleClose,
      isOpen,
      listRef,
      menuElementRef,
      setActiveIndex,
      triggerWrapper,
    });
  const { menu, submenu } = createContextMenuRendererProps({
    activeSubmenuIndex,
    closeMenu: handleClose,
    closeSubmenu,
    getItemProps,
    listRef,
    openSubmenuForIndex,
    openSubmenuIndex,
    registerListItem,
    registerSubmenuItem,
    setActiveSubmenuIndex,
    submenuItemRefs,
    submenuPosition,
    submenuRef,
  });

  return (
    <>
      <ContextMenuTrigger
        disabled={disabled}
        setTriggerWrapper={setTriggerWrapper}
        triggerId={triggerId}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuPanel
        activeIndex={activeIndex}
        className={className}
        context={context}
        getFloatingProps={getFloatingProps}
        items={items}
        menu={menu}
        menuPosition={menuPosition}
        portalRootId={portalRootId}
        setFloatingRef={setFloatingRef}
        submenu={submenu}
        visible={isVisible}
      />
    </>
  );
}

export default function DefaultContextMenu(props: ContextMenuProps) {
  return <ContextMenu {...props} />;
}
