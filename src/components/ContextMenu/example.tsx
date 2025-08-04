/**
 * Example usage of ContextMenu with tooltips
 * This demonstrates how to use the new tooltip functionality
 */

import React from 'react';
import { Copy, Edit, Trash2, ExternalLink } from 'lucide-react';
import { ContextMenu, ContextMenuItem } from '../ContextMenu';

export function ContextMenuExample() {
  const menuItems: ContextMenuItem[] = [
    {
      id: 'copy',
      label: 'Copy',
      icon: Copy,
      tooltip: 'Copy this item to your clipboard',
      shortcut: 'Ctrl+C',
      onClick: () => console.log('Copy clicked'),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      tooltip: (
        <div>
          <div className='font-medium'>Edit Item</div>
          <div className='text-xs opacity-75'>Modify the selected item</div>
        </div>
      ),
      shortcut: 'Ctrl+E',
      onClick: () => console.log('Edit clicked'),
    },
    {
      id: 'separator-1',
      separator: true,
    },
    {
      id: 'external',
      label: 'Open in Browser',
      icon: ExternalLink,
      href: 'https://example.com',
      target: '_blank',
      tooltip: 'Opens the link in a new browser tab',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'danger' as const,
      tooltip: 'Permanently delete this item (cannot be undone)',
      shortcut: 'Del',
      onClick: () => console.log('Delete clicked'),
    },
    {
      id: 'disabled',
      label: 'Disabled Action',
      icon: Edit,
      disabled: true,
      tooltip: "This tooltip won't show because the item is disabled",
      onClick: () => console.log("This won't be called"),
    },
  ];

  return (
    <div className='p-8'>
      <h2 className='text-lg font-semibold mb-4'>
        ContextMenu with Tooltips Example
      </h2>
      <ContextMenu items={menuItems}>
        <div className='p-4 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 cursor-pointer'>
          Right-click me to see the context menu with tooltips!
        </div>
      </ContextMenu>
    </div>
  );
}
