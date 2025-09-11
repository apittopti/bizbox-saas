import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

interface CollapsibleMenuProps {
  children: React.ReactNode
  className?: string
  defaultOpen?: boolean
}

interface CollapsibleMenuItemProps {
  title: string
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
  defaultOpen?: boolean
  onClick?: () => void
  href?: string
  active?: boolean
}

const CollapsibleMenu = React.forwardRef<HTMLDivElement, CollapsibleMenuProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-1", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CollapsibleMenu.displayName = "CollapsibleMenu"

const CollapsibleMenuItem = React.forwardRef<HTMLDivElement, CollapsibleMenuItemProps>(
  ({ title, icon, children, className, defaultOpen = false, onClick, href, active = false, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)
    const hasChildren = React.Children.count(children) > 0

    const handleToggle = () => {
      if (hasChildren) {
        setIsOpen(!isOpen)
      }
      onClick?.()
    }

    const ItemContent = () => (
      <div
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          active && "bg-accent text-accent-foreground",
          "cursor-pointer select-none",
          className
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </div>
        {hasChildren && (
          <span className="flex-shrink-0 ml-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    )

    return (
      <div ref={ref} {...props}>
        {href ? (
          <a href={href} className="block">
            <ItemContent />
          </a>
        ) : (
          <ItemContent />
        )}
        
        {hasChildren && isOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
            {children}
          </div>
        )}
      </div>
    )
  }
)
CollapsibleMenuItem.displayName = "CollapsibleMenuItem"

const CollapsibleMenuGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { title?: string }
>(({ title, children, className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-1", className)} {...props}>
      {title && (
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  )
})
CollapsibleMenuGroup.displayName = "CollapsibleMenuGroup"

export { CollapsibleMenu, CollapsibleMenuItem, CollapsibleMenuGroup }