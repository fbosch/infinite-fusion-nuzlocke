'use client';

import {
  FloatingPortal,
  useFloating,
  useInteractions,
  useRole,
  useDismiss,
  useListNavigation,
  FloatingFocusManager,
  shift,
  offset,
} from '@floating-ui/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import React, {
  useState,
  useRef,
  cloneElement,
  isValidElement,
  useCallback,
  useTransition,
  useEffect,
} from 'react';
import { type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { CursorTooltip } from './CursorTooltip';
import { match } from 'ts-pattern';

// Custom hook for context menu state management
function useContextMenuState() {
  const [, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openMenu = useCallback((_position: { x: number; y: number }) => {
    startTransition(() => {
      setIsOpen(true);
      setIsVisible(true);
    });
  }, []);

  const closeMenu = useCallback(() => {
    startTransition(() => {
      setIsOpen(false);
    });
  }, []);

  const hideMenu = useCallback(() => {
    startTransition(() => {
      setIsVisible(false);
    });
  }, []);

  return {
    isOpen,
    isVisible,
    activeIndex,
    setActiveIndex,
    openMenu,
    closeMenu,
    hideMenu,
  };
}

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  favicon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?: (event: React.MouseEvent<any>) => void;
  href?: string;
  target?: string;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'warning';
  shortcut?: string;
  separator?: boolean;
  tooltip?: React.ReactNode;
}

export interface ContextMenuProps {
  children: React.ReactNode;
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
  onOpenChange,
}: ContextMenuProps) {
  const {
    isOpen,
    isVisible,
    activeIndex,
    setActiveIndex,
    openMenu,
    closeMenu,
    hideMenu,
  } = useContextMenuState();

  const triggerRef = useRef<HTMLElement>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const menuElementRef = useRef<HTMLDivElement>(null);
  const virtualReferenceRef = useRef<{ getBoundingClientRect: () => DOMRect }>(
    null
  );

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Floating UI setup for keyboard navigation and positioning
  const { refs, context, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: open => {
      if (!open) closeMenu();
    },
    middleware: [
      offset(8), // Add some offset from the cursor
      shift({
        padding: 8, // Ensure menu stays within viewport with padding
        mainAxis: true, // Shift on main axis (vertical)
        crossAxis: true, // Shift on cross axis (horizontal)
      }),
    ],
    placement: 'bottom-start', // Default placement, will be adjusted by shift
    whileElementsMounted: (reference, floating, update) => {
      // Update position when elements are mounted
      update();
      // Return cleanup function
      return () => {};
    },
  });

  // Update the reference when the virtual reference changes
  useEffect(() => {
    if (isOpen && virtualReferenceRef.current) {
      refs.setReference(virtualReferenceRef.current);
    }
  }, [isOpen, refs]);

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

  // Close menu when window becomes hidden, loses focus, or scrolls
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      const isFocused = document.hasFocus();
      const shouldClose = !isVisible || !isFocused;

      if (shouldClose && isOpen) {
        closeMenu();

        // Start exit animation
        if (menuElementRef.current) {
          menuElementRef.current.classList.remove('tooltip-enter');
          menuElementRef.current.classList.add('tooltip-exit');

          setTimeout(() => {
            hideMenu();
          }, 50);
        }
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        closeMenu();

        // Start exit animation
        if (menuElementRef.current) {
          menuElementRef.current.classList.remove('tooltip-enter');
          menuElementRef.current.classList.add('tooltip-exit');

          setTimeout(() => {
            hideMenu();
          }, 50);
        }
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scroll events

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, closeMenu, hideMenu]);

  const handleClose = () => {
    closeMenu();

    // Start exit animation
    if (menuElementRef.current) {
      menuElementRef.current.classList.remove('tooltip-enter');
      menuElementRef.current.classList.add('tooltip-exit');

      // Hide menu after animation completes
      setTimeout(() => {
        hideMenu();
      }, 50); // Match CSS animation duration
    }
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    // Create a virtual reference at the cursor position
    const rect = new DOMRect(event.clientX, event.clientY, 0, 0);

    virtualReferenceRef.current = {
      getBoundingClientRect: () => rect,
    };
    openMenu({ x: event.clientX, y: event.clientY });

    // Add enter animation class after a frame
    requestAnimationFrame(() => {
      if (menuElementRef.current) {
        menuElementRef.current.classList.remove('tooltip-exit');
        menuElementRef.current.classList.add('tooltip-enter');
      }
    });
  };

  return (
    <div>
      {/* Custom trigger element */}
      {isValidElement(children) &&
        cloneElement(children, {
          ref: (node: HTMLElement | null) => {
            triggerRef.current = node;
          },
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
                ...floatingStyles,
                transformOrigin: 'top left',
              }}
              className={clsx(
                'min-w-[12rem] z-100 rounded-md border border-gray-200 dark:border-gray-800',
                'bg-white dark:bg-gray-900/80 shadow-xl shadow-black/5 dark:shadow-black/25',
                'p-1 backdrop-blur-xl tooltip-enter',
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
                      className='my-1 h-px bg-gray-200 dark:bg-gray-700/70'
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

                const baseClasses = clsx(
                  'group flex w-full items-center justify-between rounded-sm px-2 py-1.5',
                  'text-sm transition-colors duration-75 enabled:cursor-pointer',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                );

                const variantClasses = match<[string | undefined, boolean]>([
                  item.variant,
                  isActive,
                ])
                  .with(
                    ['danger', true],
                    () =>
                      'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  )
                  .with(
                    ['danger', false],
                    () =>
                      'text-red-600 dark:text-red-400 enabled:hover:bg-red-50 enabled:dark:hover:bg-red-900/20 enabled:hover:text-red-700 enabled:dark:hover:text-red-300'
                  )
                  .with(
                    ['warning', true],
                    () =>
                      'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                  )
                  .with(
                    ['warning', false],
                    () =>
                      'text-yellow-600 dark:text-yellow-400 enabled:hover:bg-yellow-50 enabled:dark:hover:bg-yellow-900/20 enabled:hover:text-yellow-700 enabled:dark:hover:text-yellow-300'
                  )
                  .otherwise(([, active]) =>
                    active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-200 enabled:hover:bg-gray-100 enabled:dark:hover:bg-gray-700 enabled:hover:text-gray-900 enabled:dark:hover:text-white'
                  );

                const commonClasses = clsx(
                  baseClasses,
                  variantClasses,
                  item.disabled && '!opacity-75 !cursor-not-allowed'
                );

                const content = (
                  <div className='flex items-center gap-x-2 w-full'>
                    {item.icon && !item.href && (
                      <item.icon
                        className={twMerge(
                          'h-4 w-4 flex-shrink-0',
                          item.iconClassName
                        )}
                        aria-hidden='true'
                      />
                    )}
                    <div className='flex items-center gap-x-2 min-w-0'>
                      {item.favicon && item.href && (
                        <Image
                          src={item.favicon}
                          alt=''
                          loading='lazy'
                          decoding='async'
                          className='h-4 w-4 flex-shrink-0 rounded-sm'
                          width={16}
                          height={16}
                          unoptimized
                          aria-hidden='true'
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className='truncate'>{item.label}</span>
                    </div>
                    {/* Right: shortcut and icon, always aligned to end */}
                    <div className='flex items-center gap-x-2 ml-auto'>
                      {item.shortcut && (
                        <span className='text-xs opacity-60'>
                          {item.shortcut}
                        </span>
                      )}
                      {item.icon && item.href && (
                        <item.icon
                          className={twMerge(
                            'h-4 w-4 flex-shrink-0',
                            item.iconClassName
                          )}
                          aria-hidden='true'
                        />
                      )}
                    </div>
                  </div>
                );

                // Render as link if href is provided
                if (item.href) {
                  const linkElement = (
                    <a
                      key={item.id}
                      ref={node => {
                        listRef.current[validIndex] = node;
                      }}
                      target={item.target}
                      href={item.href}
                      className={commonClasses}
                      onClick={e => {
                        if (!item.disabled) {
                          item.onClick?.(e);
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

                  // Wrap with tooltip if provided
                  if (item.tooltip) {
                    return (
                      <CursorTooltip
                        key={item.id}
                        content={item.tooltip}
                        placement='right'
                        delay={500}
                      >
                        {linkElement}
                      </CursorTooltip>
                    );
                  }

                  return linkElement;
                }

                // Render as button
                const buttonElement = (
                  <button
                    key={item.id}
                    ref={node => {
                      listRef.current[validIndex] = node;
                    }}
                    className={commonClasses}
                    disabled={item.disabled}
                    role='menuitem'
                    tabIndex={isActive ? 0 : -1}
                    {...getItemProps({
                      onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!item.disabled) {
                          item.onClick?.(e);
                          handleClose();
                        }
                      },
                    })}
                  >
                    {content}
                  </button>
                );

                // Wrap with tooltip if provided
                if (item.tooltip) {
                  return (
                    <CursorTooltip
                      key={item.id}
                      content={item.tooltip}
                      placement='right'
                      delay={500}
                    >
                      {buttonElement}
                    </CursorTooltip>
                  );
                }

                return buttonElement;
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
