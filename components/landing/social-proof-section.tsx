import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Priya Sharma",
    role: "Conference Chair, ICASET 2025",
    institution: "NIT Warangal",
    quote:
      "We managed 320 paper submissions entirely on Confairo. What used to take us weeks of email coordination was done in days. The certificate generation alone saved us 40+ hours.",
    highlight: "320 submissions managed",
  },
  {
    name: "Prof. Rajesh Gupta",
    role: "Head, CS Department",
    institution: "University of Mumbai",
    quote:
      "I was skeptical at first — we'd always used Google Forms. But once I saw the organizer dashboard, I couldn't go back. Knowing the status of every paper, every reviewer, every payment in real time is a game changer.",
    highlight: "Replaced 5 tools with 1",
  },
  {
    name: "Dr. Meera Krishnan",
    role: "Organizing Secretary, NCCSE 2025",
    institution: "Anna University",
    quote:
      "The review process was smooth. Reviewers got clear instructions, structured forms, and deadlines. No more chasing people on WhatsApp. We published results and certificates on the same day.",
    highlight: "Same-day certificates",
  },
];

const useCases = [
  {
    type: "Small Department Conference",
    papers: "30–80 papers",
    description:
      "Perfect for annual department seminars. Free plan covers everything — submissions, reviews, and certificates.",
  },
  {
    type: "University-Level Conference",
    papers: "150–500 papers",
    description:
      "Multi-track conferences with external reviewers. Use Pro plan for unlimited submissions and analytics.",
  },
  {
    type: "National / International Conference",
    papers: "500+ papers",
    description:
      "Large-scale events with multiple organizing committees. Institutional plan with institutional branding and SLA support.",
  },
];

export function SocialProofSection() {
  return (
    <section id="testimonials" className="bg-muted px-4 py-20 sm:px-6 sm:py-28 lg:px-8">

      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">

          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Trusted by Organizers
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What Conference Organizers Are Saying
          </h2>

        </div>

        {/* Testimonials */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">

          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group flex flex-col rounded-2xl border border-border bg-card p-8 transition hover:border-primary/20 hover:shadow-md"
            >

              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <div className="relative mt-5 flex-1">
                <Quote className="absolute -left-1 -top-2 h-8 w-8 text-border" />
                <p className="relative z-10 leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Highlight */}
              <div className="mt-5 inline-flex self-start rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {t.highlight}
              </div>

              {/* Author */}
              <div className="mt-5 border-t border-border pt-5">
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
                <p className="text-sm text-muted-foreground">{t.institution}</p>
              </div>

            </div>
          ))}

        </div>

        {/* Use Cases */}
        <div className="mt-24">

          <div className="mx-auto max-w-3xl text-center">
            <h3 className="text-2xl font-bold text-foreground sm:text-3xl">
              Built for Every Scale of Conference
            </h3>
            <p className="mt-3 text-muted-foreground">
              Whether you&apos;re running a departmental seminar or a national symposium,
              Confairo adapts to your needs.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">

            {useCases.map((uc) => (
              <div
                key={uc.type}
                className="rounded-xl border border-border bg-card p-6 transition hover:border-primary/20 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">{uc.type}</h4>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {uc.papers}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {uc.description}
                </p>
              </div>
            ))}

          </div>

        </div>

      </div>
    </section>
  );
}
