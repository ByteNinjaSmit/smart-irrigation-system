import { useState } from "react"
// import Link from "next/link"
import { Link } from "react-router-dom";
import { Home, BarChart2, History, PieChart, Lightbulb, Info, Mail, Menu, X } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/sections/theme-toggle"


export function DashboardLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { name: "Home", href: "/", icon: Home, active: false },
    { name: "Dashboard", href: "/dashboard", icon: BarChart2, active: true },
    { name: "History", href: "/history", icon: History, active: false },
    { name: "Analysis", href: "/analysis", icon: PieChart, active: false },
    { name: "Insights", href: "/insights", icon: Lightbulb, active: false },
    { name: "About", href: "/about", icon: Info, active: false },
    { name: "Contact Us", href: "/contact", icon: Mail, active: false },
  ]

  return (
    <div className="flex min-h-screen flex-col px-2 mx-auto">
      <header className="top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="mr-4 hidden md:flex">
              <Link href="/" className="flex items-center space-x-2">
                <div className="relative h-8 w-8">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 text-green-600">
                    <path
                      fill="currentColor"
                      d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"
                    />
                    <path fill="currentColor" d="M12,7V12L15,10.5L12,7" />
                  </svg>
                </div>
                <span className="font-bold text-xl text-green-600">agromate</span>
              </Link>
            </div>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
            <div className="hidden md:flex">
              <nav className="flex items-center gap-1 text-sm">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-2 font-medium transition-colors hover:text-foreground/80",
                      item.active ? "bg-green-100 text-green-600 rounded-md" : "text-foreground/60",
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden mx-auto p-2">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative h-8 w-8">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-green-600">
                  <path
                    fill="currentColor"
                    d="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"
                  />
                  <path fill="currentColor" d="M12,7V12L15,10.5L12,7" />
                </svg>
              </div>
              <span className="font-bold text-xl text-green-600">agromate</span>
            </Link>
            <Button
              variant="ghost"
              className="px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close Menu</span>
            </Button>
          </div>
          <nav className="container grid gap-2 pb-8 pt-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-foreground/80",
                  item.active ? "bg-green-100 text-green-600 rounded-md" : "text-foreground/60",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <main className="flex-1 mx-auto">
        <div className="container py-4">{children}</div>
      </main>
    </div>
  )
}
