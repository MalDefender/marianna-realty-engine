import { AdminHeader } from "../AdminShell";
import ListingForm from "../ListingForm";

export const dynamic = "force-dynamic";

export default function NewListingPage() {
  return (
    <div className="admin-shell">
      <AdminHeader />
      <div className="admin-main">
        <div className="toolbar">
          <h1>Новый объект</h1>
        </div>
        <ListingForm />
      </div>
    </div>
  );
}
