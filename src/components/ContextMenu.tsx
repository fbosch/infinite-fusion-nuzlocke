'use client';

import {
  FloatingPortal,
  useFloating,
  useInteractions,
  useRole,
  useDismiss,
  useListNavigation,
  FloatingFocusManager,
} from '@floating-ui/react';
import { clsx } from 'clsx';
import React, { useState, useRef, cloneElement, isValidElement } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'warning';
  shortcut?: string;
  separator?: boolean;
}

export interface ContextMenuProps {
  children: React.ReactElement;
  items: ContextMenuItem[];
  className?: string;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  portalRootId?: string;
}

export function ContextMenu({
  children,
  items,
  className,
  disabled = false,
  portalRootId = 'context-menu-root',
}: Omit<ContextMenuProps, 'onOpenChange'>) {
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const menuElementRef = useRef<HTMLDivElement>(null);

  // Floating UI setup for keyboard navigation
  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'menu' });
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    selectedIndex: null,
    onNavigate: setActiveIndex,
    loop: true,
  });

  const { getFloatingProps, getItemProps } = useInteractions([
    dismiss,
    role,
    listNavigation,
  ]);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    // Store the trigger element for positioning
    triggerRef.current = event.currentTarget as HTMLElement;

    // Find the scrollable container (if any)
    const scrollContainer =
      event.currentTarget.closest('[data-scroll-container]') ||
      event.currentTarget.closest(
        '.overflow-auto, .overflow-scroll, .overflow-y-auto, .overflow-y-scroll'
      ) ||
      document.documentElement;

    // Get scroll offsets
    const scrollLeft = scrollContainer.scrollLeft || 0;
    const scrollTop = scrollContainer.scrollTop || 0;

    // Get the container's position relative to viewport
    const containerRect = scrollContainer.getBoundingClientRect();

    // Calculate position relative to the scrollable container
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - containerRect.left + scrollLeft;
    const relativeY = event.clientY - containerRect.top + scrollTop;

    setMenuPosition({
      x: relativeX,
      y: relativeY,
    });

    // Show menu and start enter animation
    setIsOpen(true);
    setIsVisible(true);

    // Add enter animation class after a frame
    requestAnimationFrame(() => {
      if (menuElementRef.current) {
        menuElementRef.current.classList.remove('tooltip-exit');
        menuElementRef.current.classList.add('tooltip-enter');
      }
    });
  };

  const handleClose = () => {
    setIsOpen(false);

    // Start exit animation
    if (menuElementRef.current) {
      menuElementRef.current.classList.remove('tooltip-enter');
      menuElementRef.current.classList.add('tooltip-exit');

      // Hide menu after animation completes
      setTimeout(() => {
        setIsVisible(false);
      }, 50); // Match CSS animation duration
    }
  };

  return (
    <div>
      {/* Custom trigger element */}
      {isValidElement(children) &&
        cloneElement(children, {
          ref: triggerRef,
          onContextMenu: handleContextMenu,
        } as React.HTMLAttributes<HTMLElement>)}

      {/* Render popover in portal when visible */}
      {isVisible && triggerRef.current && (
        <FloatingPortal id={portalRootId}>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={node => {
                refs.setFloating(node);
                menuElementRef.current = node;
              }}
              style={{
                position: 'absolute',
                left: menuPosition.x,
                top: menuPosition.y,
                transformOrigin: 'top left',
                zIndex: 50,
              }}
              className={clsx(
                'min-w-[12rem] rounded-md border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800 shadow-lg shadow-black/10 dark:shadow-black/25',
                'p-1 backdrop-blur-xl',
                'origin-top-left backdrop-blur-xl',
                'focus:outline-none',
                className
              )}
              role='menu'
              aria-orientation='vertical'
              {...getFloatingProps()}
            >
              {items.map((item: ContextMenuItem, index: number) => {
                if (item.separator) {
                  return (
                    <div
                      key={`separator-${index}`}
                      className='my-1 h-px bg-gray-200 dark:bg-gray-600'
                      role='separator'
                    />
                  );
                }

                const validItems = items.filter(
                  i => !i.separator && !i.disabled
                );
                const validIndex = validItems.findIndex(
                  validItem => validItem.id === item.id
                );
                const isActive = activeIndex === validIndex;

                const commonClasses = clsx(
                  'group flex w-full items-center justify-between rounded-sm px-2 py-1.5',
                  'text-sm transition-colors duration-75 enabled:cursor-pointer',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'tooltip-enter',
                  item.variant === 'danger'
                    ? isActive
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300'
                    : item.variant === 'warning'
                      ? isActive
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                        : 'text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-700 dark:hover:text-yellow-300'
                      : isActive
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                );

                const content = (
                  <>
                    <div className='flex items-center space-x-2'>
                      {item.icon && (
                        <item.icon
                          className='h-4 w-4 flex-shrink-0'
                          aria-hidden='true'
                        />
                      )}
                      <span className='truncate'>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <span className='text-xs opacity-60'>
                        {item.shortcut}
                      </span>
                    )}
                  </>
                );

                // Render as link if href is provided
                if (item.href) {
                  return (
                    <a
                      key={item.id}
                      ref={node => {
                        listRef.current[validIndex] = node;
                      }}
                      href={item.href}
                      className={commonClasses}
                      onClick={() => {
                        if (!item.disabled) {
                          item.onClick?.();
                          handleClose();
                        }
                      }}
                      role='menuitem'
                      tabIndex={isActive ? 0 : -1}
                      {...getItemProps()}
                    >
                      {content}
                    </a>
                  );
                }

                // Render as button
                return (
                  <button
                    key={item.id}
                    ref={node => {
                      listRef.current[validIndex] = node;
                    }}
                    className={commonClasses}
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick?.();
                        handleClose();
                      }
                    }}
                    disabled={item.disabled}
                    role='menuitem'
                    tabIndex={isActive ? 0 : -1}
                    {...getItemProps()}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}

      {/* Handle outside clicks and escape key */}
      {isVisible && (
        <div
          className='fixed inset-0 z-40'
          onClick={handleClose}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              handleClose();
            }
          }}
        />
      )}
    </div>
  );
}

export default ContextMenu;
