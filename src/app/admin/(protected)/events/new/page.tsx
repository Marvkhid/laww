import type { Metadata } from "next";
import { EventForm } from "@/app/admin/(protected)/events/event-form";
import { createEventAction } from "@/app/admin/(protected)/events/actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Event — Admin",
};

export default function NewEventPage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mb-8 mt-4 font-admin text-2xl font-semibold text-ink">New Event</h1>
      <EventForm action={createEventAction} submitLabel="Create Event" />
    </div>
  );
}
