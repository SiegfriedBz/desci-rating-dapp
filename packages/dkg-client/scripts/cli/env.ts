import { env, requireEnv as requireEnvValue } from "@desci/env";

/** Env keys whose catalogued values are strings (not coerced numbers). */
type StringEnvKey = {
  [K in keyof typeof env]: (typeof env)[K] extends string | undefined
    ? K
    : never;
}[keyof typeof env];

/** Read a required catalogued string env value. */
export function requireEnv(name: StringEnvKey, hint?: string): string {
  const suffix = hint ? ` ${hint}` : "";
  return requireEnvValue(env[name], `Missing ${name}.${suffix}`);
}

/** Prefer argv[index], else the catalogued env value. */
export function argOrEnv(
  argvIndex: number,
  envName: StringEnvKey
): string | undefined {
  const fromArg = process.argv[argvIndex]?.trim();
  if (fromArg) {
    return fromArg;
  }
  return env[envName] || undefined;
}
