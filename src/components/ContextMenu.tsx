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
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openMenu = useCallback((position: { x: number; y: number }) => {
    startTransition(() => {
      setMenuPosition(position);
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
    menuPosition,
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
  label?: React.ReactNode;
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
  children?: ContextMenuItem[];
  // Remove customContent since we're using ReactNode for label now
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
    menuPosition,
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
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Floating UI setup for keyboard navigation
  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: open => {
      if (!open) closeMenu();
    },
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

  const openSubmenuForIndex = useCallback((validIndex: number) => {
    if (!menuElementRef.current) return;
    const parentEl = listRef.current[validIndex];
    if (!parentEl) return;

    // For absolute positioning, we just need to track which submenu is open
    // The positioning is handled by CSS (left: 100%, top: 0)
    setOpenSubmenuIndex(validIndex);
  }, []);

  const closeSubmenu = useCallback(() => {
    setOpenSubmenuIndex(null);
  }, []);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) return;

    event.preventDefault();
    event.stopPropagation();

    // Calculate position relative to the viewport
    const position = { x: event.clientX, y: event.clientY };
    openMenu(position);

    // Add enter animation class after a frame
    requestAnimationFrame(() => {
      if (menuElementRef.current) {
        menuElementRef.current.classList.remove('tooltip-exit');
        menuElementRef.current.classList.add('tooltip-enter');
      }
    });
  };

  return (
    <>
      {/* Custom trigger element */}
      {isValidElement(children) &&
        cloneElement(children, {
          ref: (node: HTMLElement | null) => {
            triggerRef.current = node;
            refs.setReference(node);
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
                position: 'fixed',
                left: menuPosition.x,
                top: menuPosition.y,
                transformOrigin: 'top left',
              }}
              className={clsx(
                'min-w-[12rem] z-100 rounded-md border border-gray-200 dark:border-gray-800',
                'bg-white dark:bg-gray-900/80 shadow-elevation-3',
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
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
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

                const hasChildren =
                  Array.isArray(item.children) && item.children.length > 0;
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
                      {hasChildren && (
                        <span className='text-xs opacity-60'>›</span>
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
                        if (!item.disabled && !hasChildren) {
                          item.onClick?.(e);
                          handleClose();
                        }
                      },
                      onMouseEnter: () => {
                        if (hasChildren) openSubmenuForIndex(validIndex);
                        else closeSubmenu();
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
                      <div className='relative'>
                        {buttonElement}
                        {hasChildren && openSubmenuIndex === validIndex && (
                          <div
                            ref={submenuRef}
                            style={{
                              position: 'absolute',
                              left: '100%',
                              top: 0,
                              marginLeft: '4px',
                              minWidth: '12rem',
                            }}
                            className={clsx(
                              'z-[9999] rounded-md border border-gray-200 dark:border-gray-800',
                              'bg-white dark:bg-gray-900/80 shadow-xl shadow-black/5 dark:shadow-black/25',
                              'p-1 backdrop-blur-xl origin-top-left',
                              'overflow-hidden'
                            )}
                            role='menu'
                            onMouseLeave={closeSubmenu}
                            onMouseEnter={() => {
                              // Keep submenu open when hovering over it
                              if (openSubmenuIndex !== validIndex) {
                                setOpenSubmenuIndex(validIndex);
                              }
                            }}
                          >
                            {item.children?.map(child => (
                              <button
                                key={child.id}
                                className={clsx(
                                  'group flex w-full items-center justify-between rounded-sm px-2 py-1.5',
                                  'text-sm transition-colors duration-75 enabled:cursor-pointer',
                                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                                  'text-gray-700 dark:text-gray-200 enabled:hover:bg-gray-100 enabled:dark:hover:bg-gray-700 enabled:hover:text-gray-900 enabled:dark:hover:text-white',
                                  child.disabled &&
                                    '!opacity-75 !cursor-not-allowed'
                                )}
                                disabled={child.disabled}
                                role='menuitem'
                                tabIndex={-1}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!child.disabled) {
                                    child.onClick?.(e);
                                    handleClose();
                                  }
                                }}
                              >
                                <div className='flex items-center gap-x-2 w-full'>
                                  {child.icon && (
                                    <child.icon
                                      className='h-4 w-4 flex-shrink-0'
                                      aria-hidden='true'
                                    />
                                  )}
                                  <span className='truncate'>
                                    {child.label}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CursorTooltip>
                  );
                }

                return (
                  <div key={item.id} className='relative'>
                    {buttonElement}
                    {hasChildren && openSubmenuIndex === validIndex && (
                      <div
                        ref={submenuRef}
                        style={{
                          position: 'absolute',
                          left: '100%',
                          top: 0,
                          marginLeft: '4px',
                          minWidth: '12rem',
                        }}
                        className={clsx(
                          'z-[9999] rounded-md border border-gray-200 dark:border-gray-800',
                          'bg-white dark:bg-gray-900/80 shadow-xl shadow-black/5 dark:shadow-black/25',
                          'p-1 backdrop-blur-xl origin-top-left',
                          'overflow-hidden'
                        )}
                        role='menu'
                        onMouseLeave={closeSubmenu}
                        onMouseEnter={() => {
                          // Keep submenu open when hovering over it
                          if (openSubmenuIndex !== validIndex) {
                            setOpenSubmenuIndex(validIndex);
                          }
                        }}
                      >
                        {item.children?.map(child => (
                          <button
                            key={child.id}
                            className={clsx(
                              'group flex w-full items-center justify-between rounded-sm px-2 py-1.5',
                              'text-sm transition-colors duration-75 enabled:cursor-pointer',
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                              'text-gray-700 dark:text-gray-200 enabled:hover:bg-gray-100 enabled:dark:hover:bg-gray-700 enabled:hover:text-gray-900 enabled:dark:hover:text-white',
                              child.disabled &&
                                '!opacity-75 !cursor-not-allowed'
                            )}
                            disabled={child.disabled}
                            role='menuitem'
                            tabIndex={-1}
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!child.disabled) {
                                child.onClick?.(e);
                                handleClose();
                              }
                            }}
                          >
                            <div className='flex items-center gap-x-2 w-full'>
                              {child.icon && (
                                <child.icon
                                  className='h-4 w-4 flex-shrink-0'
                                  aria-hidden='true'
                                />
                              )}
                              <span className='truncate'>{child.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
          onMouseMove={e => {
            // Close submenu if moving far away from the menu
            const withinMenu = menuElementRef.current?.contains(
              e.target as Node
            );
            const withinSubmenu = document
              .querySelector('[role="menu"][style*="z-[9999]"]')
              ?.contains(e.target as Node);
            if (!withinMenu && !withinSubmenu) closeSubmenu();
          }}
        />
      )}
    </>
  );
}

export default ContextMenu;
