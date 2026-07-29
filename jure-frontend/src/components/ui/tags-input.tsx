import { cn } from "@/lib/utils";
import * as TagsInputPrimitive from "@diceui/tags-input";
import { X } from "lucide-react";
import * as React from "react";


const TagsInputPrimitiveRoot = TagsInputPrimitive.Root;
const TagsInputPrimitiveLabel = TagsInputPrimitive.Label;
const TagsInputPrimitiveInput = TagsInputPrimitive.Input;
const TagsInputPrimitiveItem = TagsInputPrimitive.Item;
const TagsInputPrimitiveItemText = TagsInputPrimitive.ItemText;
const TagsInputPrimitiveItemDelete = TagsInputPrimitive.ItemDelete;
const TagsInputPrimitiveClear = TagsInputPrimitive.Clear;
 
const TagsInput = React.forwardRef<
  React.ComponentRef<typeof TagsInputPrimitiveRoot>,
  React.ComponentPropsWithoutRef<typeof TagsInputPrimitiveRoot>
>(({ className, ...props }, ref) => (
  <TagsInputPrimitiveRoot
    data-slot="tags-input"
    ref={ref}
    className={cn("flex w-[380px] flex-col gap-2", className)}
    {...props}
  />
));
TagsInput.displayName = TagsInputPrimitiveRoot.displayName;
 
const TagsInputLabel = React.forwardRef<
  React.ComponentRef<typeof TagsInputPrimitiveLabel>,
  React.ComponentPropsWithoutRef<typeof TagsInputPrimitiveLabel>
>(({ className, ...props }, ref) => (
  <TagsInputPrimitiveLabel
    data-slot="tags-input-label"
    ref={ref}
    className={cn(
      "font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
TagsInputLabel.displayName = TagsInputPrimitiveLabel.displayName;
 
const TagsInputList = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    data-slot="tags-input-list"
    ref={ref}
    className={cn(
      "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-1 focus-within:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TagsInputList.displayName = "TagsInputList";
 
const TagsInputInput = React.forwardRef<
  React.ComponentRef<typeof TagsInputPrimitiveInput>,
  React.ComponentPropsWithoutRef<typeof TagsInputPrimitiveInput>
>(({ className, ...props }, ref) => (
  <TagsInputPrimitiveInput
    data-slot="tags-input-input"
    ref={ref}
    className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",

    //   "flex-1 bg-transparent outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TagsInputInput.displayName = TagsInputPrimitiveInput.displayName;
 
const TagsInputItem = React.forwardRef<
  React.ComponentRef<typeof TagsInputPrimitiveItem>,
  React.ComponentPropsWithoutRef<typeof TagsInputPrimitiveItem>
>(({ className, children, ...props }, ref) => (
  <TagsInputPrimitiveItem
    data-slot="tags-input-item"
    ref={ref}
    className={cn(
      "inline-flex max-w-[calc(100%-8px)] items-center gap-1.5 rounded border bg-transparent px-2.5 py-1 text-sm focus:outline-hidden data-disabled:cursor-not-allowed data-editable:select-none data-editing:bg-transparent data-disabled:opacity-50 data-editing:ring-1 data-editing:ring-ring [&:not([data-editing])]:pr-1.5 [&[data-highlighted]:not([data-editing])]:bg-accent [&[data-highlighted]:not([data-editing])]:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <TagsInputPrimitiveItemText className="truncate">
      {children}
    </TagsInputPrimitiveItemText>
    <TagsInputPrimitiveItemDelete className="h-4 w-4 shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
      <X className="h-3.5 w-3.5" />
    </TagsInputPrimitiveItemDelete>
  </TagsInputPrimitiveItem>
));
TagsInputItem.displayName = TagsInputPrimitive.Item.displayName;
 
const TagsInputClear = React.forwardRef<
  React.ComponentRef<typeof TagsInputPrimitiveClear>,
  React.ComponentPropsWithoutRef<typeof TagsInputPrimitiveClear>
>(({ className, ...props }, ref) => (
  <TagsInputPrimitiveClear data-slot="tags-input-clear" ref={ref} {...props} />
));
TagsInputClear.displayName = TagsInputPrimitiveClear.displayName;
 
export {
  TagsInput,
  TagsInputLabel,
  TagsInputList,
  TagsInputInput,
  TagsInputItem,
  TagsInputClear,
  TagsInputPrimitiveRoot,
  TagsInputPrimitiveItemText,
  TagsInputPrimitiveItemDelete,
};