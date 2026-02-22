import { PackageIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const productType = defineType({
  name: "product",
  title: "Product",
  type: "document",
  icon: PackageIcon,
  groups: [
    { name: "details", title: "Details", default: true },
    { name: "media", title: "Media" },
    { name: "inventory", title: "Inventory" },
  ],
  fields: [
    defineField({
      name: "name",
      type: "string",
      group: "details",
      validation: (rule) => [rule.required().error("Product name is required")],
    }),
    defineField({
      name: "slug",
      type: "slug",
      group: "details",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (rule) => [
        rule.required().error("Slug is required for URL generation"),
      ],
    }),
    defineField({
      name: "description",
      type: "text",
      group: "details",
      rows: 4,
      description: "Product description",
    }),
    defineField({
      name: "imageUrl",
      type: "url",
      group: "details",
      description: "External product image URL",
      validation: (rule) => [
        rule.uri({ scheme: ["http", "https"] }).error("Use a valid URL"),
      ],
    }),
    defineField({
      name: "quantity",
      type: "string",
      group: "details",
      description: 'e.g., "250 µg"',
    }),
    defineField({
      name: "molecularWeight",
      type: "string",
      group: "details",
      description: 'e.g., "1187.3 Da"',
    }),
    defineField({
      name: "purity",
      type: "string",
      group: "details",
      description: 'e.g., ">99% by HPLC"',
    }),
    defineField({
      name: "storageBuffer",
      type: "text",
      group: "details",
      rows: 3,
      description: "Storage buffer composition",
    }),
    defineField({
      name: "storage",
      type: "text",
      group: "details",
      rows: 4,
      description: "Storage instructions",
    }),
    defineField({
      name: "certificateOfAnalysisUrl",
      type: "url",
      group: "details",
      description: "Link to Certificate of Analysis PDF",
      validation: (rule) => [
        rule.uri({ scheme: ["http", "https"] }).error("Use a valid URL"),
      ],
    }),
    defineField({
      name: "price",
      type: "number",
      group: "details",
      description: "Price in GBP (e.g., 599.99)",
      validation: (rule) => [
        rule.required().error("Price is required"),
        rule.positive().error("Price must be a positive number"),
      ],
    }),
    defineField({
      name: "category",
      type: "reference",
      to: [{ type: "category" }],
      group: "details",
      validation: (rule) => [rule.required().error("Category is required")],
    }),
    defineField({
      name: "subcategory",
      type: "reference",
      to: [{ type: "subcategory" }],
      group: "details",
    }),
    defineField({
      name: "image",
      type: "image",
      group: "media",
      options: {
        hotspot: true,
      },
      description: "Primary product image",
    }),
    defineField({
      name: "images",
      type: "array",
      group: "media",
      of: [
        {
          type: "image",
          options: {
            hotspot: true,
          },
        },
      ],
      validation: (rule) => [
        rule.min(1).error("At least one image is required"),
      ],
    }),
    defineField({
      name: "stock",
      type: "number",
      group: "inventory",
      initialValue: 0,
      description: "Number of items in stock",
      validation: (rule) => [
        rule.min(0).error("Stock cannot be negative"),
        rule.integer().error("Stock must be a whole number"),
      ],
    }),
    defineField({
      name: "featured",
      type: "boolean",
      group: "inventory",
      initialValue: false,
      description: "Show on homepage and promotions",
    }),
    defineField({
      name: "assemblyRequired",
      type: "boolean",
      group: "inventory",
      initialValue: false,
      description: "Does this product require assembly?",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "category.title",
      media: "images.0",
      price: "price",
    },
    prepare({ title, subtitle, media, price }) {
      return {
        title,
        subtitle: `${subtitle ? subtitle + " • " : ""}£${price ?? 0}`,
        media,
      };
    },
  },
});
