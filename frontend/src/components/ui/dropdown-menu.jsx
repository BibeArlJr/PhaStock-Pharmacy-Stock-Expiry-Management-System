import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

const DropdownMenuContext = createContext(null);

function useDropdownMenuContext() {
  const context = useContext(DropdownMenuContext);

  if (!context) {
    throw new Error('DropdownMenu components must be wrapped in a DropdownMenu');
  }

  return context;
}

export function DropdownMenu({ children, className }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        open &&
        !triggerRef.current?.contains(event.target) &&
        !contentRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      toggle: () => setOpen((prev) => !prev),
      close: () => setOpen(false),
    }),
    [open]
  );

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div className={cn('relative inline-flex', className)}>{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = forwardRef(({ className, children, ...props }, ref) => {
  const { open, toggle, triggerRef } = useDropdownMenuContext();

  return (
    <button
      type="button"
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={(event) => {
        event.preventDefault();
        toggle();
      }}
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      {children}
    </button>
  );
});

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuContent = forwardRef(
  ({ className, side = 'bottom', align = 'start', ...props }, ref) => {
    const { open, contentRef } = useDropdownMenuContext();
    const sideClasses = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const alignClasses = align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

    return (
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        role="menu"
        className={cn(
          'absolute z-50 min-w-[12rem] rounded-md border border-border bg-card text-card-foreground shadow-lg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'overflow-hidden',
          sideClasses,
          alignClasses,
          !open && 'hidden',
          className
        )}
        {...props}
      />
    );
  }
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = forwardRef(({ className, onClick, disabled = false, ...props }, ref) => {
  const { close } = useDropdownMenuContext();

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
    close();
  };

  return (
    <button
      type="button"
      ref={ref}
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'flex w-full cursor-pointer items-center rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    />
  );
});

DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
));

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
