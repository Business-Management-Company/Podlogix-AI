/** Destinations for every call to action. One place to change when the app URLs settle. */
export const site = {
  name: "Podlogix",
  url: "https://podlogix.io",
  /** Passwordless sign-in on the live app: Google or an emailed code. */
  signup: "https://podlogix.io/signup",
  login: "https://podlogix.io/login",
  /** Perspectives page, served by the app. */
  blog: "https://podlogix.io/blog",
  /** The hero's "Explore workspace" scrolls to the rooms, as on the live site. */
  workspaceTour: "#workspace",
  workspace: "https://podlogix.io/signup",
  demo: "https://podlogix.io/signup",
  /** The app has no public search yet; the box lands in the shows directory after sign-in. */
  search: "https://podlogix.io/shows",
  contact: "mailto:hello@podlogix.io",
  privacy: "https://podlogix.io/privacy",
  terms: "https://podlogix.io/terms",
  social: {
    instagram: "https://instagram.com/podlogix",
    linkedin: "https://linkedin.com/company/podlogix",
    x: "https://x.com/podlogix",
    github: "https://github.com/podlogix",
  },
} as const;
