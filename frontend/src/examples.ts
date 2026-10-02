import type { Example } from "./types";

export const examples: Example[] = [
  {
    id: "library",
    label: "Tool library",
    hint: "Phone-first borrowing",
    kind: "mobile",
    audience: "coding",
    depth: "standard",
    projectName: "",
    notes:
      "A neighborhood tool library where people list tools they own and neighbors can borrow them. Should work on phones. I don't want logins with passwords if I can avoid it. Maybe magic links. Need a map of what's nearby and a way to request a drill for the weekend.",
  },
  {
    id: "invoices",
    label: "Invoice studio",
    hint: "A product brief",
    kind: "web",
    audience: "product",
    depth: "standard",
    projectName: "",
    notes:
      "Invoice app for freelance illustrators. They hate spreadsheets. Want to send a pretty invoice, track who paid, and remind people. Keep it simple, no accounting software clone.",
  },
  {
    id: "notes",
    label: "Notes site",
    hint: "A thorough coding prompt",
    kind: "cli",
    audience: "coding",
    depth: "detailed",
    projectName: "",
    notes:
      "CLI that watches a folder of markdown notes and builds a static site. I use Obsidian. Don't want a database. It should rebuild when a file changes. Who is this for if I am the only author?",
  },
];
