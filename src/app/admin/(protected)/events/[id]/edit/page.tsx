import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventByIdForAdmin, getEventImagesForAdmin } from "@/lib/supabase/admin/events";
import { EventForm } from "@/app/admin/(protected)/events/event-form";
import { updateEventAction, deleteEventAction } from "@/app/admin/(protected)/events/actions";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export const metadata: Metadata = {
  title: "Edit Event — Admin",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, images] = await Promise.all([
    getEventByIdForAdmin(id),
    getEventImagesForAdmin(id),
  ]);

  if (!event) notFound();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Edit Event</h1>
        <form
          action={async () => {
            "use server";
            await deleteEventAction(event!.id);
          }}
        >
          <DeleteConfirmButton label="Delete" confirmMessage="Delete this event? This cannot be undone." />
        </form>
      </div>
      <EventForm
        action={updateEventAction.bind(null, event!.id)}
        initial={event}
        initialImages={images}
        entityId={event!.id}
        submitLabel="Save Changes"
      />
    </div>
  );
}
