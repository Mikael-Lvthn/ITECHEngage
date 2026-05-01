/**
 * Extracts a human-readable message from an unknown error thrown in a catch block.
 * Avoids the need for `catch (err: any)` throughout the codebase.
 */
export function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "An unexpected error occurred";
}
