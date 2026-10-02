"use client";

import { useState } from "react";
import { Header } from "@/components/landing/header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);

    const response = await fetch("https://formspree.io/f/xojkjwbp", {
      method: "POST",
      body: data,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      setSent(true);
      form.reset();
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">

      <Header />

      <section className="mx-auto max-w-6xl px-4 py-16">

        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold">
            Contact Us
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
            Have questions, partnership inquiries, or need support?
            We&apos;re here to help.
          </p>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">

          {/* Contact Info */}
          <div className="space-y-8">

            <div className="flex items-start gap-4">
              <Mail className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Email</p>
                <p className="text-muted-foreground">
                  contact@confairo.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Phone</p>
                <p className="text-muted-foreground">
                  +91-7796453687
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold">Location</p>
                <p className="text-muted-foreground">
                  Maharashtra, India
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted p-6">
              <p className="font-semibold">
                For Institutions &amp; Universities
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Contact us for custom deployments, institutional pricing,
                onboarding support, and academic integrations.
              </p>
            </div>

          </div>

          {/* Contact Form */}
          <div className="rounded-xl border bg-card p-8 shadow-sm">

            {sent ? (
              <div className="text-center py-10">
                <p className="text-lg font-semibold text-primary">
                  Message Sent ✓
                </p>
                <p className="mt-2 text-muted-foreground">
                  We&apos;ll get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <label className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    name="name"
                    required
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    name="email"
                    required
                    type="email"
                    placeholder="you@email.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    name="message"
                    required
                    rows={5}
                    placeholder="How can we help you?"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Sending..." : "Send Message"}
                </Button>

              </form>
            )}

          </div>

        </div>

      </section>

      <Footer />

    </main>
  );
}