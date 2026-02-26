import { cloneElement, createContext, useContext, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

const TooltipContext = createContext(null);

export function TooltipProvider({ children }) {
  return children;
}

export function Tooltip({ children }) {
  const [open, setOpen] = useState(false);

  const value = useMemo(
    () => ({
      open,
      setOpen,
    }),
    [open]
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

export function TooltipTrigger({ asChild = false, children }) {
  const ctx = useContext(TooltipContext);

  if (!ctx) {
    return children;
  }

  const triggerProps = {
    onMouseEnter: (event) => {
      children?.props?.onMouseEnter?.(event);
      ctx.setOpen(true);
    },
    onMouseLeave: (event) => {
      children?.props?.onMouseLeave?.(event);
      ctx.setOpen(false);
    },
    onFocus: (event) => {
      children?.props?.onFocus?.(event);
      ctx.setOpen(true);
    },
    onBlur: (event) => {
      children?.props?.onBlur?.(event);
      ctx.setOpen(false);
    },
  };

  if (asChild && children?.props) {
    return cloneElement(children, {
      ...children.props,
      ...triggerProps,
    });
  }

  return <span {...triggerProps}>{children}</span>;
}

export function TooltipContent({ children, className }) {
  const ctx = useContext(TooltipContext);

  if (!ctx?.open) {
    return null;
  }

  return (
    <span
      className={cn(
        'pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-white shadow-lg',
        className
      )}
      role="tooltip"
    >
      {children}
    </span>
  );
}
