"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "What makes South Bay Bio different from other suppliers?",
    answer:
      "South Bay Bio combines high-quality recombinant proteins with an AI-powered interface that helps researchers quickly find, compare, and validate products—reducing time spent searching and increasing confidence in purchase decisions.",
  },
  {
    question: "Are Certificates of Analysis (CoAs) available for every product?",
    answer:
      "Yes. Every product includes a lot-specific Certificate of Analysis (CoA), ensuring full transparency on purity, activity, and validation data. These are available directly on each product page.",
  },
  {
    question: "How do I know if a product will work for my experiment?",
    answer:
      "Each product page includes detailed specifications, validation data, and recommended applications. You can also use our AI assistant to ask experiment-specific questions and get tailored guidance.",
  },
  {
    question: "Can I request bulk pricing or custom orders?",
    answer:
      "Yes. For bulk quantities, custom protein production, or special requests, please contact our team directly through the website or email support.",
  },
  {
    question: "What applications are your recombinant proteins used for?",
    answer:
      "Our products are used across a range of applications including Western blot, ELISA, cell culture assays, and drug discovery research.",
  },
  {
    question: "How fast is shipping and fulfillment?",
    answer:
      "Orders are typically processed within 1–2 business days. Shipping timelines depend on location and selected shipping method.",
  },
  {
    question: "Do you offer technical support?",
    answer:
      "Yes. Our team provides technical support to help with product selection, protocol optimization, and troubleshooting.",
  },
  {
    question: "Can I trust the data provided on product pages?",
    answer:
      "All data is generated through validated internal processes and documented in the Certificate of Analysis. We prioritize reproducibility and scientific rigor.",
  },
  {
    question: "Is there a way to compare similar products?",
    answer:
      "Yes. Our platform allows you to explore related proteins and compare specifications to find the best fit for your research.",
  },
  {
    question: "Do you offer discounts or academic pricing?",
    answer:
      "We offer special pricing for academic institutions, bulk purchases, and repeat customers. Contact us for more details.",
  },
];

interface AccordionItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ item, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 flex items-center justify-between"
      >
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 pr-4">
          {item.question}
        </h3>
        <ChevronDown
          className={`h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="bg-zinc-50 dark:bg-zinc-900/30 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {item.answer}
          </p>
        </div>
      )}
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? faqItems : faqItems.slice(0, 4);

  const handleToggleShowAll = () => {
    if (showAll && openIndex !== null && openIndex >= 4) {
      setOpenIndex(null);
    }
    setShowAll((current) => !current);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-100 sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-300">
          Find answers to common questions about South Bay Bio, our products, and services.
        </p>
      </div>

      <div className="mx-auto max-w-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 rounded-lg overflow-hidden shadow-sm">
        {visibleItems.map((item, index) => (
          <AccordionItem
            key={index}
            item={item}
            isOpen={openIndex === index}
            onToggle={() =>
              setOpenIndex(openIndex === index ? null : index)
            }
          />
        ))}
      </div>

      {faqItems.length > 4 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleToggleShowAll}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {showAll ? "Show fewer questions" : "Show more questions"}
            <ChevronDown
              className={`h-4 w-4 text-blue-600 transition-transform dark:text-blue-400 ${
                showAll ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      )}

      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            })),
          }),
        }}
      />
    </section>
  );
}
