/** Run an async CLI main and exit non-zero on failure. */
export function runMain(main: () => Promise<void>): void {
  main().catch((err: unknown) => {
    console.error("Fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
