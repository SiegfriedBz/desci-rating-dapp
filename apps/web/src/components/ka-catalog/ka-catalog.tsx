import { getKas } from "@/lib/queries/kas";
import { KaDataTable } from "./ka-data-table";

export async function KaCatalog() {
  const kas = await getKas();
  return <KaDataTable data={kas} />;
}
