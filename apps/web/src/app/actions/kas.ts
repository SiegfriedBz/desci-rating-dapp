"use server";

import { getKas, type KaRow } from "@/lib/queries/kas";

/** Server action wrapper so TanStack Query can refetch the KA catalog. */
export async function fetchKasAction(): Promise<KaRow[]> {
  try {
    return await getKas();
  } catch {
    return [];
  }
}
