import { TeacherNav } from "@/components/teacher-nav"

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <TeacherNav />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
