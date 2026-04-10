import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FlaskConical, Landmark, Microscope, Phone, Rocket, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRobotsValue, isProteasomeSeoExperiment } from "@/lib/site";

export const metadata: Metadata = {
  title: "About | South Bay Bio",
  description:
    "Learn about South Bay Bio's mission, team expertise, and collaboration opportunities in UPS-focused drug discovery.",
  alternates: {
    canonical: "/about",
  },
  robots: getRobotsValue(!isProteasomeSeoExperiment()),
};

const FOCUS_AREAS = [
  "Ubiquitin-proteasome system (UPS) research tools",
  "Assay design and high-throughput screening support",
  "Protein labeling, purification, and characterization",
  "Custom workflows for pharma, biotech, and academic labs",
];

const DIFFERENTIATORS = [
  {
    title: "Scientific Depth",
    body: "Our leadership and advisors bring decades of practical experience across assay development, HTS, protein science, and project execution.",
    icon: Microscope,
  },
  {
    title: "Practical Economics",
    body: "We are built to deliver high-quality outputs with efficient cost structures so teams can move programs forward earlier.",
    icon: Landmark,
  },
  {
    title: "Execution Speed",
    body: "From feasibility to implementation, we prioritize clear communication and milestone-driven progress.",
    icon: Rocket,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
          <div>
            <Badge className="bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 dark:bg-teal-500/20 dark:text-teal-300">
              About South Bay Bio
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl lg:text-5xl">
              Higher quality. Lower cost.
              <br />
              Built for early-stage discovery.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
              South Bay Bio supports teams developing therapeutics in oncology and neurodegenerative disease with advanced,
              accessible biochemistry products and services.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
              Our mission is to accelerate discovery programs by combining deep UPS expertise with practical execution that
              reduces cost and technical friction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="bg-gradient-to-r from-sky-400 to-blue-600 text-white hover:from-sky-500 hover:to-blue-700">
                <Link href="#work-together">
                  Let&apos;s Work Together
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                <Link href="/services">View Services</Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-zinc-200 shadow-sm dark:border-zinc-800">
            <Image
              src="/biocube.webp"
              alt="South Bay Bio headquarters at BioCube in San Jose"
              width={1280}
              height={720}
              className="h-full w-full object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-rose-50/70 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-rose-200/70 bg-white/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">Focus Areas</p>
            <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
              {FOCUS_AREAS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Who We Serve</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
            Pharma, biotech, and academic teams in active R&amp;D
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
            We partner with research groups that need reliable products and custom methods during lead identification and early
            drug discovery. Bulk formats and tailored modifications are available when programs require scale or a specific assay context.
          </p>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">A Note from our Team</p>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-2xl">South Bay Bio</h3>

            <div className="mt-4 space-y-5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-base">
              <p>
                As numerous pharmaceutical companies continue investing in Ubiquitin Proteasome System (UPS)-targeted
                drug development the need for cutting edge and effective technologies grows. Quite simply, existing
                technologies and services are ineffective and expensive.
              </p>

              <p>
                Our mission is to provide innovative &amp; cost effective HTS products &amp; services, accelerating early stage
                drug development for cancer and neurodegenerative diseases.
              </p>

              <p>
                South Bay Bio is a biotechnology company dedicated to providing HTS related products and services with a
                focus on the ubiquitin proteasome system. The company was formed in the San Francisco Bay area to provide
                support to local biotechnology companies, and is located in the city of San Jose. Our leadership team
                consists of accomplished scientists with decades of experience in assay development, HTS, protein
                purification, and bioconjugation with a history of successful project management. Our advisors include
                successful scientists and entrepreneurs specialized and focused in commercial HTS, drug discovery, and
                academic research.
              </p>

              <p>
                Our customers are primarily pharmaceutical companies and biotech firms engaging in R&amp;D and early stage
                drug discovery. We also cater to academia. All of our products are available in bulk pricing and can be
                modified to meet individual needs. Please contact us for more information.
              </p>

              <p>
                If you're interested in collaborating with South Bay Bio in academic or commercial research, we encourage
                you to contact us. Our research interests encompass everything related to the UPS, but we also hope to
                inspire innovative research in all areas of science where our technology and expertise may be supportive.
              </p>

              <p>Higher quality. Lower cost. It's that simple.</p>

              <p className="font-medium">-Team SBB</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {DIFFERENTIATORS.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <CardHeader className="pb-2">
                    <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg text-zinc-950 dark:text-zinc-100">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="work-together" className="bg-white dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Let&apos;s Work Together</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              Start a research conversation with our team
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
              If you are exploring academic or commercial collaboration, tell us your target, assay strategy, and timeline.
              We will help define a practical path with the right products and technical support.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-gradient-to-r from-sky-400 to-blue-600 text-white hover:from-sky-500 hover:to-blue-700">
                <Link href="mailto:orders@south-bay-bio.com">
                  Contact Orders Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                <Link href="mailto:support@south-bay-bio.com">
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Scientific Support
                </Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Call</p>
                <p className="mt-1 font-medium"><Phone className="mr-1 inline h-4 w-4" />(415) 935-3226</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">General Help</p>
                <p className="mt-1 font-medium">support@south-bay-bio.com</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Orders</p>
                <p className="mt-1 font-medium">orders@south-bay-bio.com</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Location</p>
                <p className="mt-1 font-medium">5941 Optical Court, Suite 229, San Jose, CA 95138</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 text-sm">
              <Link href="/privacy-policy" className="text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">
                Privacy and Cookie Policy
              </Link>
              <Link href="/terms-of-sale" className="text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">
                Terms of Sale
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
