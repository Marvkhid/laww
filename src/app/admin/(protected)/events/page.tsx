import type { Metadata } from "next";
import Link from "next/link";
import { listEventsForAdmin } from "@/lib/supabase/admin/events";
import { deleteEventAction } from "./actions";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export const metadata: Metadata = {
  title: "Events — Admin",
};

export default async function AdminEventsPage() {
  const events = await listEventsForAdmin();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Events</h1>
        <Link
          href="/admin/events/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm uppercase tracking-wide text-paper"
        >
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="font-admin text-sm text-[#333]">
          No events yet. Create your first event to get started.
        </p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between border border-hairline p-4"
            >
              <div>
                <p className="font-admin text-sm font-medium text-ink">
                  {event.title}
                </p>
                <p className="font-admin text-xs text-[#333]">
                  /{event.slug}
                  {event.event_date ? ` · ${event.event_date}` : ""}
                  {typeof event.page_number === "number" ? ` · p. ${event.page_number}` : ""}
                  {event.published ? "" : " · Draft"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/events/${event.id}/edit`}
                  className="font-admin text-xs font-medium uppercase tracking-wide text-digest-red hover:text-digest-red-deep transition-opacity"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteEventAction(event.id);
                  }}
                >
                  <DeleteConfirmButton
                    label="Delete"
                    confirmMessage="Delete this event? This cannot be undone."
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
