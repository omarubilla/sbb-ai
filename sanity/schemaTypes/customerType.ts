import { UserIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const customerType = defineType({
  name: "customer",
  title: "Customer",
  type: "document",
  icon: UserIcon,
  groups: [
    { name: "details", title: "Customer Details", default: true },
    { name: "address", title: "Address" },
    { name: "billing", title: "Billing" },
    { name: "stripe", title: "Stripe" },
  ],
  fields: [
    defineField({
      name: "email",
      type: "string",
      group: "details",
      validation: (rule) => [rule.required().error("Email is required")],
    }),
    defineField({
      name: "name",
      type: "string",
      group: "details",
      description: "Customer's full name",
    }),
    defineField({
      name: "phone",
      type: "string",
      group: "details",
    }),
    defineField({
      name: "company",
      type: "string",
      group: "details",
    }),
    defineField({
      name: "clerkUserId",
      type: "string",
      group: "details",
      description: "Clerk user ID for authentication",
    }),
    defineField({
      name: "wixCustomerId",
      type: "string",
      group: "details",
      description: "Original Wix customer ID",
    }),
    defineField({
      name: "customerSince",
      type: "datetime",
      group: "details",
      description: "Date customer account was created",
    }),
    defineField({
      name: "streetAddress",
      type: "string",
      group: "address",
      description: "Street address line",
    }),
    defineField({
      name: "city",
      type: "string",
      group: "address",
    }),
    defineField({
      name: "state",
      type: "string",
      group: "address",
      description: "State or province",
    }),
    defineField({
      name: "zip",
      type: "string",
      group: "address",
    }),
    defineField({
      name: "country",
      type: "string",
      group: "address",
    }),
    defineField({
      name: "billingFirstName",
      type: "string",
      group: "billing",
    }),
    defineField({
      name: "billingLastName",
      type: "string",
      group: "billing",
    }),
    defineField({
      name: "billingAddress",
      type: "string",
      group: "billing",
      description: "Full billing address string",
    }),
    defineField({
      name: "stripeCustomerId",
      type: "string",
      group: "stripe",
      readOnly: true,
      description: "Stripe customer ID for payments",
    }),
    defineField({
      name: "createdAt",
      type: "datetime",
      group: "details",
      readOnly: true,
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      email: "email",
      name: "name",
      company: "company",
    },
    prepare({ email, name, company }) {
      return {
        title: name ?? email ?? "Unknown Customer",
        subtitle: company ? `${company} • ${email ?? ""}` : (email ?? ""),
      };
    },
  },
  orderings: [
    {
      title: "Newest First",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
    {
      title: "Email A-Z",
      name: "emailAsc",
      by: [{ field: "email", direction: "asc" }],
    },
  ],
});
