import { ArrowUpRightIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const Home = () => (
  <div className="flex flex-col items-start gap-4">
    <h1 className="text-2xl font-semibold tracking-tight">Ready to build</h1>
    <p className="text-muted-foreground">
      Start in src/app/page.tsx. The rules for each folder are in .claude/rules, and the setup choices are in
      decisions.md.
    </p>
    <a href="https://nextjs.org/docs" className={cn(buttonVariants({ variant: "outline" }))}>
      Next.js docs
      <ArrowUpRightIcon data-icon="inline-end" />
    </a>
  </div>
)

export default Home
