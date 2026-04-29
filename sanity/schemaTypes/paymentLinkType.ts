import { LinkIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const paymentLinkType = defineType({
  name: "paymentLink",
  title: "Payment Link",
  type: "document",
  icon: LinkIcon,
  fields: [
    defineField({
      name: "invoiceNumber",
      title: "Invoice Number / Description",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "amount",
      title: "Amount",
      type: "number",
      validation: (rule) => rule.required().min(0.01),
    }),
    defineField({
      name: "url",
      title: "Bankful Payment URL",
      type: "url",
      readOnly: true,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Paid", value: "paid" },
          { title: "Void", value: "void" },
        ],
      },
      initialValue: "active",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "customerEmail",
      title: "Customer Email",
      type: "string",
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      readOnly: true,
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: "invoiceNumber",
      subtitle: "amount",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Unknown Invoice",
        subtitle: subtitle ? `$${subtitle}` : "No amount",
        icon: LinkIcon,
      };
    },
  },
});
