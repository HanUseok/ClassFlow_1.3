"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, CalendarDays, Users, Settings } from "lucide-react"

const navItems = [
  { label: "메인", href: "/teacher", icon: LayoutDashboard },
  { label: "세션", href: "/teacher/sessions", icon: CalendarDays },
  { label: "학생", href: "/teacher/students", icon: Users },
  { label: "설정", href: "/teacher/settings", icon: Settings },
]

export function TeacherNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/teacher" className="text-lg font-semibold tracking-tight font-sans">
          ClassFlow
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/teacher"
                ? pathname === "/teacher"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
