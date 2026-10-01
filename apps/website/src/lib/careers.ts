export type CareerOpening = {
  slug: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  closingDate: string;
  status: "OPEN" | "CLOSED";
  screeningQuestions: string[];
};

// Vacancies are published only after owner approval. Keeping this registry empty
// prevents placeholder roles from being presented as genuine openings.
export const careerOpenings: CareerOpening[] = [];

export function getCareerOpening(slug: string) {
  return careerOpenings.find((opening) => opening.slug === slug && opening.status === "OPEN");
}
