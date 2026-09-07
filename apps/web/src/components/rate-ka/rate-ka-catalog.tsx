import {
  DKG_CATALOG_UNAVAILABLE_MESSAGE,
  getDkgAvailability,
} from "@/lib/dkg-availability";
import { getUnratedKas } from "@/lib/queries/contract/ratings";
import type { UnratedKaRow } from "@/lib/queries/contract/ratings-types";
import { RateKaTableClient } from "./rate-ka-table-client";

export async function RateKaCatalog() {
  const dkg = await getDkgAvailability();
  let initialData: UnratedKaRow[] = [];
  let unavailable = !dkg.available;

  if (dkg.available) {
    try {
      initialData = await getUnratedKas();
    } catch {
      unavailable = true;
    }
  }

  return (
    <div className="space-y-3">
      {unavailable ? (
        <p
          className="rounded-md border border-border bg-surface/60 px-4 py-3 text-sm text-muted"
          role="status"
        >
          {DKG_CATALOG_UNAVAILABLE_MESSAGE}
        </p>
      ) : null}
      <RateKaTableClient
        initialData={initialData}
        emptyMessage={
          unavailable
            ? "No publications to show while DKG is offline."
            : "No unrated Knowledge Assets in the catalog. Paste a UAL below if you have one."
        }
        enableRefetch={!unavailable}
      />
    </div>
  );
}
