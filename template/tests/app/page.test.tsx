import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import Home from "@/app/page"

describe("home page", () => {
  test("greets the reader and links to the Next.js docs", () => {
    render(<Home />)

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ready to build")
    expect(screen.getByRole("link", { name: "Next.js docs" }).getAttribute("href")).toBe("https://nextjs.org/docs")
  })
})
