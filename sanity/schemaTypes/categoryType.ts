import { TagIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const categoryType = defineType({
  name: "category",
  title: "Category",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "name",
      title: "Legacy Name",
      type: "string",
      hidden: true,
      readOnly: true,
      description: "Legacy field kept for backward compatibility",
    }),
    defineField({
      name: "title",
      type: "string",
      validation: (rule) => [
        rule.required().error("Category title is required"),
      ],
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: (doc) =>
          (doc as { title?: string; name?: string }).title ||
          (doc as { title?: string; name?: string }).name ||
          "",
        maxLength: 96,
      },
      validation: (rule) => [
        rule.required().error("Slug is required for URL generation"),
      ],
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "image",
      type: "image",
      options: {
        hotspot: true,
      },
      description: "Category thumbnail image",
    }),
  ],
  preview: {
    select: {
      title: "title",
      legacyName: "name",
      media: "image",
    },
    prepare({
      title,
      legacyName,
      media,
    }) {
      return {
        title: title || legacyName || "Untitled Category",
        media: media as any,
      };
    },
  },
});

export const subcategoryType = defineType({
  name: "subcategory",
  title: "Subcategory",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "name",
      type: "string",
      validation: (rule) => [
        rule.required().error("Subcategory name is required"),
      ],
    }),
    defineField({
      name: "slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (rule) => [
        rule.required().error("Slug is required"),
      ],
    }),
    defineField({
      name: "parentCategory",
      type: "reference",
      to: [{ type: "category" }],
      validation: (rule) => [
        rule.required().error("Parent category is required"),
      ],
    }),
    defineField({
      name: "description",
      type: "text",
      rows: 2,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "description",
    },
  },
});
