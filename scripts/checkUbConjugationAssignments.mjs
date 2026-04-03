import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf8");

function getEnv(key) {
  const match = env.match(new RegExp(`^${key}="?([^\n"]+)"?`, "m"));
  return match?.[1];
}

const client = createClient({
  projectId: getEnv("NEXT_PUBLIC_SANITY_PROJECT_ID") ?? "y5o7s0vz",
  dataset: getEnv("NEXT_PUBLIC_SANITY_DATASET") ?? "production",
  apiVersion: "2025-12-05",
  token: getEnv("SANITY_API_WRITE_TOKEN"),
  useCdn: false,
});

const data = await client.fetch(`{
  "subcategories": *[_type == "subcategory" && category._ref == "category-ub-conjugation"]|order(title asc){
    _id,
    title,
    "slug": slug.current,
    "productCount": count(*[_type == "product" && category._ref == "category-ub-conjugation" && subcategory._ref == ^._id])
  },
  "e1Products": *[_type == "product" && category._ref == "category-ub-conjugation" && subcategory._ref == "subcategory-e1s"]|order(name asc){name}
}`);

console.log(JSON.stringify(data, null, 2));
