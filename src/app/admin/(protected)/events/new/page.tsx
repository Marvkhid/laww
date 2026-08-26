import type { Metadata } from "next";
import { EventForm } from "@/app/admin/(protected)/events/event-form";
import { createEventAction } from "@/app/admin/(protected)/events/actions";

export const metadata: Metadata = {
  title: "New Event — Admin",
};

export default function NewEventPage() {
  return (
    <div>
      <h1 className="mb-8 font-admin text-2xl font-semibold text-ink">New Event</h1>
      <EventForm action={createEventAction} submitLabel="Create Event" />
    </div>
  );
}
