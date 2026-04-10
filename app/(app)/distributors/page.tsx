import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRobotsValue, isProteasomeSeoExperiment } from "@/lib/site";

export const metadata: Metadata = {
  title: "Distributors | South Bay Bio",
  description:
    "International distributor network for South Bay Bio products.",
  alternates: {
    canonical: "/distributors",
  },
  robots: getRobotsValue(!isProteasomeSeoExperiment()),
};

const DISTRIBUTORS = [
  {
    name: "Adipogen International",
    url: "https://adipogen.com/storeconfig/choose/store?destination=",
    logo: "/adipogen-logo.avif",
    summary:
      "Life science reagent supplier focused on immunology, inflammation, cancer, metabolic and neurodegeneration research.",
  },
  {
    name: "Grandbio",
    url: "https://www.grandbio.co.kr/",
    logo: "/grandbio.avif",
    summary: "Regional distributor partner for South Bay Bio products.",
  },
  {
    name: "Funakoshi Co.",
    url: "https://www.funakoshi.co.jp/",
    logo: "/funakoshi.avif",
    summary:
      "Tokyo-based distributor serving life science research reagent and instrument markets since 1923.",
  },
  {
    name: "Eubio",
    url: "https://eubio.at/",
    logo: "/eubio.avif",
    summary:
      "Austrian life science distribution partner with a broad reagent catalog and online ordering platform.",
  },
  {
    name: "Vinci-Biochem",
    url: "https://www.vincibiochem.it/",
    logo: "/vincibiochem.avif",
    summary:
      "Supplier of innovative scientific research reagents and products across Italy, Slovenia, and Malta.",
  },
  {
    name: "Spinchem",
    url: "http://spinchem.cz/",
    logo: "/spinchem.avif",
    summary:
      "Czech distributor for chemistry, biology, and molecular biology products including antibody portfolios.",
  },
  {
    name: "Nordic Biosite",
    url: "https://nordicbiosite.com/",
    logo: "/biosite.avif",
    summary:
      "Nordic distributor supporting pharmaceutical, biotech, diagnostics, and academic customers.",
  },
  {
    name: "Immuno Diagnostic OY",
    url: "https://www.immunodiagnostic.fi/en/",
    logo: "/immunodiagon.avif",
    summary:
      "Finnish supplier of reagents and instruments for molecular biology, ELISA, histology, and cell culture.",
  },
  {
    name: "Coger SAS",
    url: "http://www.cogershop.com/",
    logo: "/coger.avif",
    summary:
      "French reagent distributor with decades of experience serving research laboratories.",
  },
  {
    name: "CliniSciences",
    url: "https://www.clinisciences.com/",
    logo: "/clinsci.avif",
    summary:
      "Distributor of life science reagents to diagnostic and research laboratories across multiple domains.",
  },
  {
    name: "Biomol",
    url: "https://www.biomol.com/",
    logo: "/biomol.avif",
    summary:
      "Germany-based supplier of biotechnology and life science products with long-standing market presence.",
  },
  {
    name: "Izinta Trading Co. Ltd.",
    url: "https://www.izinta.hu/en/home/",
    logo: "/izinta.avif",
    summary:
      "Hungarian life science distribution partner supporting laboratory and research communities.",
  },
];

export default function DistributorsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <Badge className="bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 dark:bg-teal-500/20 dark:text-teal-300">
            International Distributors
          </Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl lg:text-5xl">
            Global Distribution Network
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
            South Bay Bio products are available through trusted distributors across multiple regions. Use the directory
            below to connect with the closest partner for quotations, ordering, and regional support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DISTRIBUTORS.map((item) => (
            <Card key={item.name} className="flex flex-col rounded-2xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardHeader className="pb-2">
                <div className="mb-3 flex h-16 items-center">
                  <Image
                    src={item.logo}
                    alt={`${item.name} logo`}
                    width={160}
                    height={64}
                    className="max-h-14 w-auto object-contain"
                  />
                </div>
                <CardTitle className="text-lg text-zinc-950 dark:text-zinc-100">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.summary}</p>
                <Button asChild variant="outline" className="mt-4 border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                  <Link href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                    <Globe2 className="h-4 w-4" />
                    Visit Website
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              Need help finding the right distributor?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
              Contact our team and we will connect you with the best regional partner for your ordering and technical needs.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-gradient-to-r from-sky-400 to-blue-600 text-white hover:from-sky-500 hover:to-blue-700">
                <Link href="mailto:orders@south-bay-bio.com">Email orders@south-bay-bio.com</Link>
              </Button>
              <Button asChild variant="outline" className="border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                <Link href="tel:+14159353226">Call (415) 935-3226</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
