import { existsSync } from "node:fs";
import { join } from "node:path";
import ReefExperience from "@/components/reef/ReefExperience";

// Evaluated at build time (static page): the resume button only renders when
// public/resume.pdf actually ships with the deployment.
const HAS_RESUME = existsSync(join(process.cwd(), "public", "resume.pdf"));

export default function Home() {
  return <ReefExperience hasResume={HAS_RESUME} />;
}