import { getKas, type KaRow } from "@/lib/queries/kas";
import { KaDataTableClient } from "./ka-data-table-client";

const CATALOG_UNAVAILABLE =
  "Catalog unavailable — DKG daemon not reachable in this environment.";

type KaCatalogProps = {
  dkgAvailable: boolean;
  dkgUnavailableReason?: string | null;
};

export async function KaCatalog({
  dkgAvailable,
  dkgUnavailableReason,
}: KaCatalogProps) {
  let initialData: KaRow[] = [];
  let unavailableMessage: string | null = null;

  if (!dkgAvailable) {
    unavailableMessage = dkgUnavailableReason?.trim()
      ? `Catalog unavailable — ${dkgUnavailableReason.trim()}`
      : CATALOG_UNAVAILABLE;
  } else {
    try {
      initialData = await getKas();
    } catch (err) {
      unavailableMessage =
        err instanceof Error && err.message.trim()
          ? `Catalog unavailable — ${err.message.trim()}`
          : CATALOG_UNAVAILABLE;
    }
  }

  return (
    <div className="space-y-3">
      {unavailableMessage ? (
        <p
          className="rounded-md border border-border bg-surface/60 px-4 py-3 text-sm text-muted"
          role="status"
        >
          {unavailableMessage}
        </p>
      ) : null}
      <KaDataTableClient
        initialData={initialData}
        emptyMessage={
          unavailableMessage
            ? "No publications to show while DKG is offline."
            : undefined
        }
        enableRefetch={!unavailableMessage}
      />
    </div>
  );
}
