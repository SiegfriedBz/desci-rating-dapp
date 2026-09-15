import { env } from "@desci/env";

/** Env keys whose catalogued values are strings (not coerced numbers). */
type StringEnvKey = {
  [K in keyof typeof env]: (typeof env)[K] extends string | undefined
    ? K
    : never;
}[keyof typeof env];

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
