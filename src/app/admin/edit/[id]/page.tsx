import { notFound } from "next/navigation";
import { getListing, initDb } from "@/lib/db";
import { AdminHeader } from "../../AdminShell";
import ListingForm from "../../ListingForm";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: { id: string } }) {
  await initDb();
  const item = await getListing(params.id);
  if (!item) notFound();

  return (
    <div className="admin-shell">
      <AdminHeader />
      <div className="admin-main">
        <div className="toolbar">
          <h1>Редактирование</h1>
        </div>
        <ListingForm initial={item} id={item.id} />
      </div>
    </div>
  );
}
