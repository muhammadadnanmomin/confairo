import Link from "next/link";
import { ThemeLogo } from "@/components/theme-logo";
import { Mail, Phone, Linkedin } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Social Icons                                                       */
/* ------------------------------------------------------------------ */

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
      style={{ color: "#FFFFFF" }}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const navigation = {
  product: [
    { name: "Features", href: "/#features" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Plans", href: "/#pricing" },
    { name: "Conferences", href: "/conferences" },
  ],

  resources: [
    { name: "Blog", href: "/blog" },
    { name: "User Guide", href: "/user-guide" },
    { name: "FAQs", href: "/faq" },
    { name: "System Status", href: "/status" },
  ],

  company: [
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms & Conditions", href: "/terms" },
  ],

  account: [
    { name: "Log In", href: "/login" },
    { name: "Get Started", href: "/signup" },
    { name: "Dashboard", href: "/dashboard" },
  ],
};

export function Footer() {
  return (
    <footer
      id="footer"
      className="border-t px-4 py-10 sm:px-6 lg:px-8"
      style={{
        borderColor: "var(--lp-border)",
        backgroundColor: "var(--lp-surface)",
      }}
    >
      <div className="mx-auto max-w-7xl">

        {/* Top Section */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">

          {/* Brand — spans 2 cols */}
          <div className="lg:col-span-2">

            <Link href="/" className="flex items-center">
              <ThemeLogo
                lightSrc="/logos/Transparent_Logo.png"
                darkSrc="/logos/Dark_Mode_Transparent_Logo.png"
                alt="Confairo"
                width={144}
                height={48}
                priority
                className="w-[135px] md:w-[144px] h-auto object-contain"
              />
            </Link>

            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-[var(--lp-ink-tertiary)]">
              Academic conference management platform for universities
              and research communities.
            </p>

            {/* Contact */}
            <div className="mt-3 space-y-1 text-sm text-[var(--lp-ink-tertiary)]">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[var(--lp-accent)]" />
                contact@confairo.com
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[var(--lp-accent)]" />
                +91-7796453687
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-4 flex items-center gap-2.5">
              <a
                href="https://www.linkedin.com/company/confairo"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Confairo on LinkedIn"
                title="Confairo on LinkedIn"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#161B26] text-white shadow-xs transition-colors duration-200 hover:bg-[var(--lp-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)] dark:bg-[#252C3D] dark:border dark:border-[var(--lp-border)] dark:hover:bg-[var(--lp-accent)] dark:hover:border-transparent"
              >
                <Linkedin className="h-4 w-4" style={{ color: "#FFFFFF" }} />
              </a>

              <a
                href="https://x.com/confairo_"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Confairo on X (formerly Twitter)"
                title="Confairo on X"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#161B26] text-white shadow-xs transition-colors duration-200 hover:bg-[var(--lp-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-accent)] dark:bg-[#252C3D] dark:border dark:border-[var(--lp-border)] dark:hover:bg-[var(--lp-accent)] dark:hover:border-transparent"
              >
                <XIcon className="h-4 w-4" />
              </a>
            </div>

          </div>

          {/* Product */}
          <FooterColumn title="Product" items={navigation.product} />

          {/* Resources */}
          <FooterColumn title="Resources" items={navigation.resources} />

          {/* Company */}
          <FooterColumn title="Company" items={navigation.company} />

          {/* Account */}
          <FooterColumn title="Account" items={navigation.account} />

        </div>

        {/* Bottom Bar */}
        <div
          className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-5 sm:flex-row"
          style={{ borderColor: "var(--lp-border)" }}
        >
          <p className="text-xs text-[var(--lp-ink-tertiary)]">
            © {new Date().getFullYear()} Confairo. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}

/* Footer Column */
function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { name: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--lp-ink)]">
        {title}
      </h3>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className="text-sm text-[var(--lp-ink-tertiary)] transition-colors duration-200 hover:text-[var(--lp-accent)]"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}