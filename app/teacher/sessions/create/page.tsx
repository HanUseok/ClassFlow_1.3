import { Suspense } from "react"
import { CreateSessionPageContent } from "@/components/session/create-session-page-content"

export default function CreateSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl rounded-lg border border-border p-6 text-sm text-muted-foreground">
          불러오는 중...
        </div>
      }
    >
      <CreateSessionPageContent />
    </Suspense>
  )
}
