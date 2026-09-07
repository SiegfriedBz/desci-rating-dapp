import {
  DKG_CATALOG_UNAVAILABLE_MESSAGE,
  getDkgAvailability,
} from "@/lib/dkg-availability";
import { getKas } from "@/lib/queries/dkg/kas";
import type { KaRow } from "@/lib/queries/kas-types";
import { KaDataTableClient } from "./ka-data-table-client";

export async function KaCatalog() {
  const dkg = await getDkgAvailability();
  let initialData: KaRow[] = [];
  let unavailable = !dkg.available;

  if (dkg.available) {
    try {
      initialData = await getKas();
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
      <KaDataTableClient
        initialData={initialData}
        emptyMessage={
          unavailable
            ? "No publications to show while DKG is offline."
            : undefined
        }
        enableRefetch={!unavailable}
      />
    </div>
  );
}
