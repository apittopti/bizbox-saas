import * as React from "react"
import { cn } from "../../lib/utils"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
}

const ResponsiveLayout = React.forwardRef<HTMLDivElement, ResponsiveLayoutProps>(
  ({ 
    children, 
    className, 
    sidebar, 
    header, 
    footer, 
    sidebarCollapsed = false,
    onSidebarToggle,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("min-h-screen bg-background", className)}
        {...props}
      >
        {/* Header */}
        {header && (
          <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {header}
          </header>
        )}

        <div className="flex">
          {/* Sidebar */}
          {sidebar && (
            <>
              {/* Mobile sidebar overlay */}
              <div
                className={cn(
                  "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden",
                  sidebarCollapsed ? "hidden" : "block"
                )}
                onClick={onSidebarToggle}
              />
              
              {/* Sidebar */}
              <aside
                className={cn(
                  "fixed left-0 top-0 z-50 h-full w-64 border-r bg-background transition-transform lg:relative lg:translate-x-0",
                  sidebarCollapsed ? "-translate-x-full lg:w-16" : "translate-x-0",
                  header && "lg:top-[var(--header-height,4rem)]"
                )}
              >
                <div className="h-full overflow-y-auto p-4">
                  {sidebar}
                </div>
              </aside>
            </>
          )}

          {/* Main content */}
          <main className={cn(
            "flex-1 overflow-x-hidden",
            sidebar && "lg:ml-0"
          )}>
            <div className="container mx-auto p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Footer */}
        {footer && (
          <footer className="border-t bg-background">
            {footer}
          </footer>
        )}
      </div>
    )
  }
)
ResponsiveLayout.displayName = "ResponsiveLayout"

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ children, className, maxWidth = 'lg', ...props }, ref) => {
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      full: 'max-w-full'
    }

    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto w-full px-4 sm:px-6 lg:px-8",
          maxWidthClasses[maxWidth],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveContainer.displayName = "ResponsiveContainer"

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ children, className, cols = { default: 1, md: 2, lg: 3 }, gap = 4, ...props }, ref) => {
    const gridClasses = []
    
    if (cols.default) gridClasses.push(`grid-cols-${cols.default}`)
    if (cols.sm) gridClasses.push(`sm:grid-cols-${cols.sm}`)
    if (cols.md) gridClasses.push(`md:grid-cols-${cols.md}`)
    if (cols.lg) gridClasses.push(`lg:grid-cols-${cols.lg}`)
    if (cols.xl) gridClasses.push(`xl:grid-cols-${cols.xl}`)

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          gridClasses.join(' '),
          `gap-${gap}`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveGrid.displayName = "ResponsiveGrid"

// Responsive breakpoint hook
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg')

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width < 640) setBreakpoint('sm')
      else if (width < 768) setBreakpoint('md')
      else if (width < 1024) setBreakpoint('lg')
      else if (width < 1280) setBreakpoint('xl')
      else setBreakpoint('2xl')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}

// Mobile detection hook
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  return isMobile
}

export { ResponsiveLayout, ResponsiveContainer, ResponsiveGrid }