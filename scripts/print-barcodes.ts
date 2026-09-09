// Prints NourishIQ codes for a few foods — used to verify barcode quick-add.
import { FOODS } from "../src/lib/nourishiq/foods";
import { barcodeOf } from "../src/lib/nourishiq/barcode";

const names = ["Paneer (fresh)", "Steel-cut oats (cooked)", "Whole egg (boiled)", "Curd / dahi"];
for (const n of names) {
  const f = FOODS.find((x) => x.name === n);
  if (f) console.log(`${f.name}: ${barcodeOf(f.id)}`);
}
console.log("total foods:", FOODS.length);

// sanity: all codes unique & valid check digits
const codes = new Set<string>();
let ok = true;
for (const f of FOODS) {
  const c = barcodeOf(f.id);
  if (codes.has(c)) { ok = false; console.error("DUPLICATE", c, f.name); }
  codes.add(c);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(c[i]) * (i % 2 === 0 ? 1 : 3);
  if ((10 - (sum % 10)) % 10 !== Number(c[12])) { ok = false; console.error("BAD CHECK", c, f.name); }
}
console.log("unique + valid EAN check digits:", ok, "| codes:", codes.size);
