import { education, experience, profile, projects } from "./data.ts";
import { districts } from "./worldLayout.ts";

export type Point = [number, number, number];
export type ZoneId =
  "about" | "experience" | "projects" | "education" | "contact";
const sectorDefinitions: {
  id: ZoneId;
  name: string;
  x: number;
  z: number;
  color: string;
  description: string;
}[] = [
  {
    id: "about",
    name: "Meet Seth",
    x: -20,
    z: 0,
    color: "#e17a54",
    description: "Meet the person behind the pipelines.",
  },
  {
    id: "experience",
    name: "Work & experience",
    x: 0,
    z: -30,
    color: "#628d82",
    description: "My work, from accounting to AI automation.",
  },
  {
    id: "projects",
    name: "Projects",
    x: 34,
    z: -7,
    color: "#d7a342",
    description: "Drive between the things I’ve built.",
  },
  {
    id: "education",
    name: "Education",
    x: -31,
    z: -28,
    color: "#9f9e66",
    description: "Where the journey started.",
  },
  {
    id: "contact",
    name: "Contact",
    x: 30,
    z: 28,
    color: "#7b9da6",
    description: "A few ways to get in touch.",
  },
];
export type Exhibit = {
  id: string;
  zone: ZoneId;
  position: Point;
  title: string;
  kicker: string;
  subtitle: string;
  text: string;
  color: string;
  url?: string;
  source?: string;
  action?: string;
  rotation?: number;
};
const portfolioEntries: Exhibit[] = [
  {
    id: "hello",
    zone: "about",
    position: [-9, 3.7, 0],
    title: "Hello, I’m Seth.",
    kicker: "01 / THE HUMAN",
    subtitle: profile.role,
    text: "Based in Cape Town. I build data pipelines, connect systems, and create useful AI automations.\n\nTake a drive through my neighbourhood, or browse the chapters here. You’ll find my work, projects, education, and ways to get in touch.",
    color: "#e17a54",
  },
  {
    id: "toolkit",
    zone: "about",
    position: [-22, 3.7, -5],
    title: "Connect. Build. Repeat.",
    kicker: "MY TOOLKIT",
    subtitle: "Data engineering / AI automation",
    text: "ETL pipelines · API integrations · PostgreSQL · Web scraping · LangChain · LangFlow · Google Cloud · Power BI · Looker Studio.\n\nMy roots: JavaScript, Vue, Node.js, MySQL, HTML, CSS, and WordPress.",
    color: "#e17a54",
  },
  {
    id: "offscreen",
    zone: "about",
    position: [-31, 3.7, 5],
    title: "A little off-screen.",
    kicker: "BEYOND THE WORK",
    subtitle: "A curious human, first.",
    text: "Poetry. Staying active. A game of football. Building things and learning how they work.\n\nTry the ramps in the makers’ yard or nudge a stack of tires. A portfolio should have room to play.",
    color: "#e17a54",
  },
  ...experience.map((e, i) => ({
    id: `work-${i}`,
    zone: "experience" as const,
    position: [-9 + (i % 3) * 10, 3.7, -27 - Math.floor(i / 3) * 13] as Point,
    title: e.title,
    kicker: `EXPERIENCE / 0${i + 1}`,
    subtitle: `${e.company}\n${e.date}`,
    text: e.text,
    color: "#628d82",
    url: "/seth-kallis-profile.pdf",
    action: "Full profile",
  })),
  ...projects.map((p, i) => ({
    id: `project-${i}`,
    zone: "projects" as const,
    position: [25 + (i % 3) * 10, 3.7, -3 - Math.floor(i / 3) * 13] as Point,
    title: p.title,
    kicker: `PROJECT / ${p.number} / ${p.tag}`,
    subtitle: "An earlier chapter of my web development journey.",
    text: p.description,
    color: "#d7a342",
    url: p.live,
    source: `${profile.github}/${p.repo}`,
    action: "Open project",
  })),
  ...education.map((e, i) => ({
    id: `education-${i}`,
    zone: "education" as const,
    position: [-37 + i * 11, 3.7, -31] as Point,
    title: e.title,
    kicker: `EDUCATION / 0${i + 1}`,
    subtitle: `${e.company}\n${e.date}`,
    text: e.text,
    color: "#9f9e66",
  })),
  {
    id: "email",
    zone: "contact",
    position: [23, 3.7, 25],
    title: "Good things start with hello.",
    kicker: "THE SIGNAL STATION",
    subtitle: profile.email,
    text: "Have a question, a project in mind, or want to talk data and technology?\n\nI’d love to hear from you. Send a signal.",
    color: "#7b9da6",
    url: `mailto:${profile.email}`,
    action: "Write an email",
  },
  {
    id: "linkedin",
    zone: "contact",
    position: [34, 3.7, 25],
    title: "Let’s connect.",
    kicker: "LINKEDIN",
    subtitle: "Seth Kallis / Cape Town, South Africa",
    text: "My professional journey, experience, and connections.\n\nData engineering and AI automation, one useful connection at a time.",
    color: "#7b9da6",
    url: profile.linkedin,
    action: "Open LinkedIn",
  },
  {
    id: "github",
    zone: "contact",
    position: [45, 3.7, 25],
    title: "Behind the builds.",
    kicker: "GITHUB",
    subtitle: "github.com/SethJKallis",
    text: "Source code, projects, and experiments from my development journey.\n\nThere’s always something to learn by building.",
    color: "#7b9da6",
    url: profile.github,
    action: "Open GitHub",
  },
];
export const zones = sectorDefinitions.map((sector) => {
  const district = districts.find((d) => d.id === sector.id)!;
  return {
    ...sector,
    ...district,
    firstEntry: portfolioEntries.find((e) => e.zone === sector.id)!.id,
  };
});
export const exhibits: Exhibit[] = portfolioEntries.map((entry) => {
  const zone = zones.find((z) => z.id === entry.zone)!;
  return {
    ...entry,
    position: [zone.landmark[0], 2, zone.landmark[2]],
    rotation: zone.rotation,
  };
});
export type DriveInput = {
  keys: Set<string>;
  throttle: number;
  steering: number;
  brake: boolean;
  jump: number;
  reset: number;
};
export type Telemetry = {
  x: number;
  z: number;
  speed: number;
  heading: number;
  near: string | null;
  airborne: boolean;
  flipped: boolean;
};
