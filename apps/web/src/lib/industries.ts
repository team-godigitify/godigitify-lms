// Single source of truth for the industry picker — the new-lead and edit-lead
// forms both render this list, and they used to carry their own copies that
// drifted apart. `industry` is a free String column, so entries can be added
// here without a migration; existing leads keep whatever label they were saved
// with even if it is later removed from this list.
export const INDUSTRIES = [
  "E-commerce",
  "Real Estate",
  "Education",
  "Healthcare",
  "Restaurant / Food",
  "Fashion & Apparel",
  "Clothing",
  "Shoes",
  "Jewellery",
  "Perfume",
  "Beauty & Wellness",
  "Skincare",
  "Haircare",
  "Travel & Hospitality",
  "Finance & Insurance",
  "Technology / SaaS",
  "Manufacturing",
  "Retail",
  "NGO / Non-profit",
  "Other",
] as const;
