import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const TabsTransitionContext = React.createContext<{ opacity: number }>({ opacity: 1 });

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ onValueChange, defaultValue, value: valueProp, children, ...props }, ref) => {
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const activeValue = isControlled ? valueProp : internalValue;
  const [opacity, setOpacity] = React.useState(1);
  const transitioning = React.useRef(false);

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (transitioning.current || newValue === activeValue) return;
      transitioning.current = true;
      setOpacity(0);
      setTimeout(() => {
        if (!isControlled) setInternalValue(newValue);
        onValueChange?.(newValue);
        setOpacity(1);
        setTimeout(() => {
          transitioning.current = false;
        }, 180);
      }, 150);
    },
    [activeValue, isControlled, onValueChange]
  );

  return (
    <TabsTransitionContext.Provider value={{ opacity }}>
      <TabsPrimitive.Root
        ref={ref}
        value={activeValue}
        onValueChange={handleValueChange}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsTransitionContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium",
      "transition-colors duration-200",
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-background data-[state=active]:text-foreground",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, style, ...props }, ref) => {
  const { opacity } = React.useContext(TabsTransitionContext);
  return (
    <TabsPrimitive.Content
      ref={ref}
      style={{
        ...style,
        opacity,
        transition: "opacity 0.15s ease-in-out",
      }}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
