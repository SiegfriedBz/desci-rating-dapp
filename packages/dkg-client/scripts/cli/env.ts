/** Read a required process.env value (trimmed). */
export function requireEnv(name: string, hint?: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    const suffix = hint ? ` ${hint}` : "";
    throw new Error(`Missing ${name}.${suffix}`);
  }
  return value;
}

/** Prefer argv[index], else process.env[name]. */
export function argOrEnv(
  argvIndex: number,
  envName: string
): string | undefined {
  const fromArg = process.argv[argvIndex]?.trim();
  if (fromArg) {
    return fromArg;
  }
  const fromEnv = process.env[envName]?.trim();
  return fromEnv || undefined;
}

/** Require argv or env; throw with a clear hint if neither is set. */
export function requireArgOrEnv(
  argvIndex: number,
  envName: string,
  hint: string
): string {
  const value = argOrEnv(argvIndex, envName);
  if (!value) {
    throw new Error(hint);
  }
  return value;
}
