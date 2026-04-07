import { Truck } from "lucide-react";

export function ShippingBanner() {
  return (
    <div className="sticky top-0 z-40 bg-teal-50 dark:bg-teal-950/30 border-b border-teal-200 dark:border-teal-900">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4 text-sm font-medium text-teal-900 dark:text-teal-200">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0" />
            <span>Free Same-day Shipping on Domestic Orders over $750</span>
          </div>
          <span className="text-teal-400 dark:text-teal-600">•</span>
          <span>Direct Shipping to Europe and Asia — For orders over $1,000, 50% off overseas shipments</span>
        </div>
      </div>
    </div>
  );
}
