import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#03122D] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <div>
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">South Bay Bio</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-100/90">
              We offer a variety of custom biochemistry services with an
              emphasis on assay development and custom protein labeling.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-100/90">
              Our goal is to advance into lead identification and provide you
              with the tools and knowledge to succeed.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              Custom Biochemistry
            </h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-100/90">
              <li>
                Assay design &amp; development: TR-FRET, ELISA, Fluorescence
                Polarization
              </li>
              <li>
                Protein &amp; antibody labeling: Maleimide, NHS, Hydrazide
                coupling &amp; more
              </li>
              <li>
                Expression &amp; purification: E. coli, Yeast, Insect,
                Mammalian
              </li>
              <li>
                Protein characterization, enzyme kinetics, IC50 &amp; Ki
                determination
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">Contact Us</h3>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-100/90">
              <p>
                <span className="font-semibold">CALL:</span> (415) 935-3226
              </p>
              <p>
                <span className="font-semibold">General Help:</span>{" "}
                <a
                  href="mailto:support@south-bay-bio.com"
                  className="text-blue-300 transition-colors hover:text-blue-200"
                >
                  support@south-bay-bio.com
                </a>
              </p>
              <p>
                <span className="font-semibold">Orders and Shipping:</span>{" "}
                <a
                  href="mailto:orders@south-bay-bio.com"
                  className="text-blue-300 transition-colors hover:text-blue-200"
                >
                  orders@south-bay-bio.com
                </a>
              </p>
              <p>
                5941 Optical Court, Suite 229
                <br />
                San Jose, CA 95138
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-5">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-300 sm:text-sm">
            <Link
              href="/privacy-policy"
              className="transition-colors hover:text-white"
            >
              Privacy and Cookie Policy
            </Link>
            <a href="#" className="transition-colors hover:text-white">
              Orders and Returns
            </a>
            <Link href="/sitemap-links" className="transition-colors hover:text-white">
              Sitemap
            </Link>
            <Link href="/terms-of-sale" className="transition-colors hover:text-white">
              Terms of Sale
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-400 sm:text-sm">
            &copy; 2026 by South Bay Bio LLC
          </p>
        </div>
      </div>
    </footer>
  );
}
