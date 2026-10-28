import type { Instrumentation } from "next"

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logRequestError } = await import("@/config/logger")
    logRequestError(error, request, context)
  }
}
