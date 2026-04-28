import { defineQuery } from "next-sanity";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants/stock";

// ============================================
// Shared Query Fragments (DRY)
// ============================================

/** Common filter conditions for product filtering */
const PRODUCT_FILTER_CONDITIONS = `
  _type == "product" && !(name match "Bankful Test*")
  && ($categorySlug == "" || category->slug.current == $categorySlug)
  && (
    $subcategorySlug == ""
    || subcategory->slug.current == $subcategorySlug
    || (
      category->slug.current == "proteasome"
      && (
        (
          $subcategorySlug == "26s-proteasome"
          && (
            lower(name) match "*26s proteasome*"
            || lower(name) match "*26 proteasome*"
            || slug.current match "26s-proteasome*"
          )
        )
        || (
          $subcategorySlug == "20s-immunoproteasomes"
          && lower(name) match "*20s immunoproteasome*"
          && !(lower(name) match "*kit*")
        )
        || (
          $subcategorySlug == "proteasome-kits"
          && (
            lower(name) match "*proteasome kit*"
            || lower(name) match "*immunoproteasome kit*"
          )
        )
        || (
          $subcategorySlug == "20s-proteasome"
          && (
            (
              lower(name) match "*20s proteasome*"
              && !(lower(name) match "*immunoproteasome*")
            )
            || lower(name) match "*20s proteasome kit*"
          )
        )
        || (
          $subcategorySlug == "substrates"
          && (
            lower(name) match "*anw-amc*"
            || lower(name) match "*pal-amc*"
            || lower(name) match "*wla-amc*"
            || lower(name) match "*llvy-amc*"
            || lower(name) match "*z-lle-amc*"
            || lower(name) match "*ac-ala-asn-trp-amc*"
            || lower(name) match "*ac-pro-ala-leu-amc*"
            || lower(name) match "*ac-trp-leu-ala-amc*"
            || lower(name) match "*suc-leu-leu-val-tyr-amc*"
            || lower(name) match "*z-leu-leu-glu-amc*"
          )
        )
      )
    )
  )
  && ($color == "" || color == $color)
  && ($material == "" || material == $material)
  && (
    $subcategorySlug != "20s-proteasome"
    || !(category->slug.current == "proteasome" && lower(name) match "*immunoproteasome*")
  )
  && ($minPrice == 0 || price >= $minPrice)
  && ($maxPrice == 0 || price <= $maxPrice)
  && ($searchQuery == "" || name match $searchQuery + "*" || description match $searchQuery + "*")
  && ($inStock == false || stock > 0)
`;

/** Projection for filtered product lists (includes multiple images for hover) */
const FILTERED_PRODUCT_PROJECTION = `{
  _id,
  name,
  "slug": slug.current,
  description,
  quantity,
  price,
  imageUrl,
  imageUrls,
  "image": image{
    asset->{
      _id,
      url
    }
  },
  "images": images[0...4]{
    _key,
    asset->{
      _id,
      url
    }
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  subcategory->{
    _id,
    "slug": slug.current
  },
  material,
  color,
  stock
}`;

/** Scoring for relevance-based search */
const RELEVANCE_SCORE = `score(
  boost(name match $searchQuery + "*", 3),
  boost(description match $searchQuery + "*", 1)
)`;

// ============================================
// All Products Query
// ============================================

/**
 * Get all products with category expanded
 * Used on landing page
 */
export const ALL_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);

/**
 * Get featured products for homepage carousel
 */
export const FEATURED_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && stock > 0
  && featured == true
] | order(name asc) [0...60] {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  stock
}`);

/**
 * Get products by category slug
 */
export const PRODUCTS_BY_CATEGORY_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && category->slug.current == $categorySlug
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  stock
}`);

/**
 * Get single product by slug
 * Used on product detail page
 */
export const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && (slug.current == $slug || slug.current == "/" + $slug)
][0] {
  _id,
  name,
  "slug": slug.current,
  description,
  imageUrl,
  imageUrls,
  "image": image{
    asset->{
      _id,
      url
    },
    hotspot
  },
  quantity,
  molecularWeight,
  purity,
  storageBuffer,
  storage,
  certificateOfAnalysisUrl,
  price,
  "images": images[]{
    _key,
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);

// ============================================
// Search & Filter Queries (Server-Side)
// Uses GROQ score() for relevance ranking
// ============================================

/**
 * Search products with relevance scoring
 * Uses score() + boost() for better ranking
 * Orders by relevance score descending
 */
export const SEARCH_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && (
    name match $searchQuery + "*"
    || description match $searchQuery + "*"
  )
] | score(
  boost(name match $searchQuery + "*", 3),
  boost(description match $searchQuery + "*", 1)
) | order(_score desc) {
  _id,
  _score,
  name,
  "slug": slug.current,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  stock
}`);

/**
 * Filter products - ordered by name (A-Z)
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_NAME_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(name asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by price ascending
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_PRICE_ASC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(price asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by price descending
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_PRICE_DESC_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | order(price desc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Filter products - ordered by relevance (when searching)
 * Uses score() for search term matching
 * Returns up to 4 images for hover preview in product cards
 */
export const FILTER_PRODUCTS_BY_RELEVANCE_QUERY = defineQuery(
  `*[${PRODUCT_FILTER_CONDITIONS}] | ${RELEVANCE_SCORE} | order(_score desc, name asc) ${FILTERED_PRODUCT_PROJECTION}`
);

/**
 * Get products by IDs (for cart/checkout)
 */
export const PRODUCTS_BY_IDS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && _id in $ids
] {
  _id,
  name,
  "slug": slug.current,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    },
    hotspot
  },
  stock
}`);

/**
 * Get low stock products (admin)
 * Uses LOW_STOCK_THRESHOLD constant for consistency
 */
export const LOW_STOCK_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && stock > 0
  && stock <= ${LOW_STOCK_THRESHOLD}
] | order(stock asc) {
  _id,
  name,
  "slug": slug.current,
  stock,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  }
}`);

/**
 * Get out of stock products (admin)
 */
export const OUT_OF_STOCK_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && stock == 0
] | order(name asc) {
  _id,
  name,
  "slug": slug.current,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  }
}`);

// ============================================
// AI Shopping Assistant Query
// Uses score() + boost() with all filters for AI agent
// ============================================

/**
 * Search products for AI shopping assistant
 * Full-featured search with all filters and product details
 */
export const AI_SEARCH_PRODUCTS_QUERY = defineQuery(`*[
  _type == "product" && !(name match "Bankful Test*")
  && (
    $searchQuery == ""
    || name match $searchQuery + "*"
    || description match $searchQuery + "*"
    || category->title match $searchQuery + "*"
  )
  && ($categorySlug == "" || category->slug.current == $categorySlug)
  && ($material == "" || material == $material)
  && ($color == "" || color == $color)
  && ($minPrice == 0 || price >= $minPrice)
  && ($maxPrice == 0 || price <= $maxPrice)
] | order(name asc) [0...20] {
  _id,
  name,
  "slug": slug.current,
  description,
  price,
  "image": images[0]{
    asset->{
      _id,
      url
    }
  },
  category->{
    _id,
    title,
    "slug": slug.current
  },
  material,
  color,
  dimensions,
  stock,
  featured,
  assemblyRequired
}`);
