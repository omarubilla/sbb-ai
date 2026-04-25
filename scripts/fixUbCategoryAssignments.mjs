const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_WRITE_TOKEN;
const apply = process.argv.includes("--apply");

if (!projectId || !dataset) {
  console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET");
  process.exit(1);
}

if (!token) {
  console.error("Missing SANITY_API_WRITE_TOKEN");
  process.exit(1);
}

const queryBase = `https://${projectId}.api.sanity.io/v2021-10-21/data/query/${dataset}`;
const mutateUrl = `https://${projectId}.api.sanity.io/v2021-10-21/data/mutate/${dataset}`;

async function sanityQuery(query) {
  const res = await fetch(`${queryBase}?query=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Sanity-Perspective": "previewDrafts",
    },
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.description || `Query failed (${res.status})`);
  }
  return json.result;
}

async function sanityMutate(mutations) {
  const res = await fetch(mutateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mutations }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.description || `Mutation failed (${res.status})`);
  }
  return json;
}

const data = await sanityQuery(`{
  "ubCategory": *[_type=="category" && slug.current=="ub-deconjugation"][0]{_id,title,"slug":slug.current},
  "mismatches": *[_type=="product" && (subcategory->slug.current in ["dubs","ubiquitinated-substrates"]) && category->slug.current != "ub-deconjugation"]|order(name asc){_id,name,"slug":slug.current,"cat":category->slug.current,"sub":subcategory->slug.current},
  "counts": {
    "ub": count(*[_type=="product" && category->slug.current=="ub-deconjugation"]),
    "e3": count(*[_type=="product" && category->slug.current=="e3-ligases"])
  }
}`);

const ubCategory = data.ubCategory;
const mismatches = data.mismatches || [];

if (!ubCategory?._id) {
  throw new Error("Could not find category slug 'ub-deconjugation'");
}

console.log(`Before: UB=${data.counts?.ub ?? 0}, E3=${data.counts?.e3 ?? 0}`);
console.log(`UB category: ${ubCategory._id} (${ubCategory.slug})`);
console.log(`Mismatches to move: ${mismatches.length}`);
for (const p of mismatches) {
  console.log(`- ${p._id} | ${p.name} | ${p.cat} -> ub-deconjugation | sub=${p.sub}`);
}

if (!apply) {
  console.log("Dry run only. Re-run with --apply to update documents.");
  process.exit(0);
}

if (mismatches.length === 0) {
  console.log("No updates needed.");
  process.exit(0);
}

const mutations = mismatches.map((p) => ({
  patch: {
    id: p._id,
    set: {
      category: {
        _type: "reference",
        _ref: ubCategory._id,
      },
    },
  },
}));

await sanityMutate(mutations);

const after = await sanityQuery(`{
  "ub": count(*[_type=="product" && category->slug.current=="ub-deconjugation"]),
  "e3": count(*[_type=="product" && category->slug.current=="e3-ligases"]),
  "remaining": count(*[_type=="product" && (subcategory->slug.current in ["dubs","ubiquitinated-substrates"]) && category->slug.current != "ub-deconjugation"])
}`);

console.log(`After: UB=${after.ub ?? 0}, E3=${after.e3 ?? 0}, Remaining mismatches=${after.remaining ?? 0}`);
