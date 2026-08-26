export type NewsletterFormState = {
  status: "idle" | "success" | "already_subscribed" | "error";
  message: string | null;
};

export const NEWSLETTER_IDLE_STATE: NewsletterFormState = {
  status: "idle",
  message: null,
};
