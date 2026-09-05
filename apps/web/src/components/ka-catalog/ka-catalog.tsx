import { getKas } from "@/lib/queries/kas";
import { KaDataTableClient } from "./ka-data-table-client";

export async function KaCatalog() {
  const initialData = await getKas();
  return <KaDataTableClient initialData={initialData} />;
}
