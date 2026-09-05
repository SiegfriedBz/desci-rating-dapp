import { getKas, type KaRow } from "@/lib/queries/kas";
import { DKG_CATALOG_UNAVAILABLE_MESSAGE } from "@/lib/dkg-availability";
import { KaDataTableClient } from "./ka-data-table-client";

type KaCatalogProps = {
  dkgAvailable: boolean;
};

export async function KaCatalog({ dkgAvailable }: KaCatalogProps) {
  let initialData: KaRow[] = [];
  let unavailable = !dkgAvailable;

  if (dkgAvailable) {
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
