import { defineQuery } from "next-sanity";

/**
 * Get all categories with their subcategories
 * Used for navigation and filters
 */
export const ALL_CATEGORIES_QUERY = defineQuery(`*[
  _type == "category"
] | order(coalesce(title, name) asc) {
  _id,
  "title": coalesce(title, name),
  "slug": slug.current,
  "image": image{
    asset->{
      _id,
      url
    },
    hotspot
  },
  "subcategories": *[_type == "subcategory" && references(^._id)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    description
  }
}`);

/**
 * Get category by slug
 */
export const CATEGORY_BY_SLUG_QUERY = defineQuery(`*[
  _type == "category"
  && slug.current == $slug
][0] {
  _id,
  "title": coalesce(title, name),
  "slug": slug.current,
  "image": image{
    asset->{
      _id,
      url
    },
    hotspot
  }
}`);
