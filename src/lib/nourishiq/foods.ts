// ─── NourishIQ Food Database ────────────────────────────────────────────────
// Values per 100 g as commonly consumed (cooked where noted).
// Indicative averages compiled from IFCT-2017, USDA FDC and ICMR-NIN tables.
// gi: 0 = not applicable (negligible carbohydrate).
// ─────────────────────────────────────────────────────────────────────────────

import type { Food } from "./types";

const F = (
  id: string, name: string, emoji: string, category: Food["category"],
  kcal: number, protein: number, carbs: number, sugar: number, fiber: number, fat: number,
  gi: number, flags: Partial<Pick<Food, "gluten" | "lactose" | "nuts" | "vegan" | "vegetarian" | "eggs" | "processed">>,
  serving: string, note: string,
): Food => ({
  id, name, emoji, category, kcal, protein, carbs, sugar, fiber, fat, gi,
  gluten: false, lactose: false, nuts: false,
  vegan: true, vegetarian: true, eggs: false, processed: false,
  ...flags, serving, note,
});

export const FOODS: Food[] = [
  // ── Grains & Millets ──
  F("quinoa", "Quinoa (cooked)", "🌾", "Grains & Millets", 120, 4.4, 21.3, 0.9, 2.8, 1.9, 53, {}, "1 katori (150 g)", "Complete protein grain with all 9 essential amino acids — a rare plant-based feat."),
  F("brown_rice", "Brown rice (cooked)", "🍚", "Grains & Millets", 123, 2.7, 25.6, 0.4, 1.6, 1.0, 68, {}, "1 katori (150 g)", "Bran layer keeps magnesium & B-vitamins; cool it after cooking for extra resistant starch."),
  F("white_rice", "White rice (cooked)", "🍚", "Grains & Millets", 130, 2.7, 28.2, 0.1, 0.4, 0.3, 73, {}, "1 katori (150 g)", "High GI — cool overnight and reheat, or pair with dal to blunt the spike."),
  F("oats_steel", "Steel-cut oats (cooked)", "🥣", "Grains & Millets", 71, 2.5, 12.4, 0.3, 1.7, 1.5, 55, {}, "1 bowl (200 g)", "Beta-glucan fibre lowers LDL cholesterol. Buy certified gluten-free if coeliac."),
  F("oats_rolled", "Rolled oats (cooked)", "🥣", "Grains & Millets", 68, 2.4, 12.0, 0.3, 1.6, 1.4, 58, {}, "1 bowl (200 g)", "The beta-glucan in oats is a proven cholesterol-lowering soluble fibre."),
  F("chapati", "Whole-wheat chapati", "🫓", "Grains & Millets", 264, 9.0, 50.0, 2.5, 5.5, 3.5, 62, { gluten: true }, "2 medium (60 g)", "Whole wheat keeps the bran — still gluten, so off-limits on a gluten-free plan."),
  F("ragi_flour", "Ragi (finger millet) flour", "🌾", "Grains & Millets", 328, 7.2, 66.8, 0.5, 11.2, 1.9, 54, {}, "½ katori flour (50 g)", "Calcium champion (344 mg/100 g) with a low GI — ideal for diabetics and bones."),
  F("jowar_flour", "Jowar (sorghum) flour", "🌾", "Grains & Millets", 334, 9.4, 62.0, 2.5, 9.7, 3.4, 52, {}, "½ katori flour (50 g)", "Gluten-free millet rich in polyphenols — great roti base for gut health."),
  F("bajra_flour", "Bajra (pearl millet) flour", "🌾", "Grains & Millets", 361, 11.6, 67.0, 1.2, 8.6, 4.9, 54, {}, "½ katori flour (50 g)", "Warming winter millet with iron & magnesium; traditionally eaten with ghee & jaggery."),
  F("foxtail_millet", "Foxtail millet (cooked)", "🌾", "Grains & Millets", 118, 3.5, 23.7, 0.2, 2.4, 0.7, 50, {}, "1 katori (150 g)", "Low-GI rice substitute — excellent for blood-sugar control."),
  F("whole_bread", "Whole-grain bread", "🍞", "Grains & Millets", 247, 13.0, 41.0, 4.0, 6.0, 3.4, 58, { gluten: true }, "2 slices (56 g)", "Check labels: many 'brown' breads use maida + caramel colour. Look for 'whole grain' first."),
  F("white_bread", "White bread (maida)", "🍞", "Grains & Millets", 265, 9.0, 49.0, 5.0, 2.7, 3.2, 75, { gluten: true, processed: true }, "2 slices (56 g)", "Ultra-processed, high GI — the classic example of what to swap out."),
  F("poha", "Poha (flattened rice, cooked)", "🍛", "Grains & Millets", 130, 2.6, 26.0, 0.5, 1.0, 1.3, 72, {}, "1 plate (150 g)", "Light but high-GI — add peanuts, sprouts and veggies to slow it down."),
  F("idli", "Idli (steamed)", "🍥", "Grains & Millets", 122, 3.8, 24.0, 0.6, 1.0, 0.5, 68, {}, "2 idlis (100 g)", "Fermentation improves B-vitamins; pair with sambar for protein + fibre."),
  F("dosa", "Dosa (plain)", "🥞", "Grains & Millets", 168, 3.9, 28.0, 0.8, 1.6, 3.7, 70, {}, "1 dosa (100 g)", "Crispy but oil-cooked; choose masala with extra stuffing or paper-thin to cut oil."),
  F("ww_pasta", "Whole-wheat pasta (cooked)", "🍝", "Grains & Millets", 124, 5.3, 26.5, 1.1, 4.5, 0.8, 48, { gluten: true }, "1 cup (140 g)", "Al dente pasta has a surprisingly low GI — cooking time matters."),
  F("besan", "Besan (chickpea flour)", "🥣", "Grains & Millets", 387, 22.0, 52.0, 4.9, 10.8, 6.7, 44, {}, "½ katori (50 g)", "Chilla/besan batter = protein + low GI. One of the smartest gluten-free flours."),

  // ── Legumes & Pulses ──
  F("toor_dal", "Toor dal (cooked)", "🍲", "Legumes & Pulses", 118, 6.5, 17.6, 1.2, 6.5, 1.5, 29, {}, "1 katori (150 g)", "Staple dal with a very low GI — the backbone of Indian protein."),
  F("moong_dal", "Moong dal (cooked)", "🍲", "Legumes & Pulses", 105, 7.1, 19.0, 1.1, 7.6, 0.6, 31, {}, "1 katori (150 g)", "Easiest dal to digest — ideal on recovery days or for sensitive guts."),
  F("chana", "Chickpeas (kabuli, cooked)", "🫘", "Legumes & Pulses", 164, 8.9, 27.4, 4.8, 7.6, 2.6, 28, {}, "1 katori (130 g)", "Fibre + protein combo keeps you full for hours; hummus and chana both work."),
  F("rajma", "Rajma (kidney beans, cooked)", "🫘", "Legumes & Pulses", 127, 8.7, 22.8, 0.3, 6.4, 0.5, 24, {}, "1 katori (140 g)", "One of the lowest-GI carbs available — portion the rice, double the rajma."),
  F("kala_chana", "Kala chana (black chickpea, cooked)", "🫘", "Legumes & Pulses", 150, 8.9, 24.0, 2.0, 7.6, 2.6, 28, {}, "1 katori (130 g)", "Breakfast-of-champions in many Indian homes — iron-rich and very low GI."),
  F("moong_sprouts", "Moong sprouts", "🌱", "Legumes & Pulses", 30, 3.0, 5.9, 0.4, 1.8, 0.2, 25, {}, "1 cup (80 g)", "Sprouting boosts vitamin C and enzyme availability — eat lightly steamed if gassy."),
  F("soy_chunks", "Soy chunks", "🌱", "Legumes & Pulses", 345, 52.0, 33.0, 3.0, 13.0, 0.5, 15, {}, "½ cup dry (40 g)", "52 g protein per 100 g — the single most protein-dense plant food. A veg bodybuilder's staple."),
  F("tofu", "Tofu (firm)", "🧊", "Legumes & Pulses", 76, 8.0, 1.9, 0.6, 0.3, 4.8, 15, {}, "½ block (100 g)", "Complete plant protein with calcium (set with calcium salts) — very versatile."),
  F("green_peas", "Green peas", "🟢", "Legumes & Pulses", 81, 5.4, 14.5, 5.7, 5.7, 0.4, 48, {}, "1 katori (100 g)", "Technically a legume — plant protein + fibre in a sweet little package."),
  F("lobia", "Lobia (black-eyed peas, cooked)", "🫘", "Legumes & Pulses", 116, 7.7, 20.0, 0.6, 6.5, 0.5, 33, {}, "1 katori (140 g)", "Potassium-rich pulse — good for blood pressure alongside its low GI."),

  // ── Vegetables ──
  F("spinach", "Spinach (palak)", "🥬", "Vegetables", 23, 2.9, 3.6, 0.4, 2.2, 0.4, 15, {}, "1 katori cooked (100 g)", "Iron + folate + nitrates for blood pressure. Cook lightly — iron absorbs better."),
  F("broccoli", "Broccoli", "🥦", "Vegetables", 34, 2.8, 6.6, 1.7, 2.6, 0.4, 15, {}, "1 cup chopped (90 g)", "Sulforaphane — one of the most studied anti-cancer plant compounds."),
  F("cauliflower", "Cauliflower", "🥬", "Vegetables", 25, 1.9, 5.0, 1.9, 2.0, 0.3, 15, {}, "1 cup (100 g)", "Rice/grain mimic when grated — a gluten-free, low-GI swap star."),
  F("carrot", "Carrot", "🥕", "Vegetables", 41, 0.9, 9.6, 4.7, 2.8, 0.2, 39, {}, "1 medium (60 g)", "Beta-carotene needs a little fat to absorb — cook with oil or pair with nuts."),
  F("beetroot", "Beetroot", "🟣", "Vegetables", 43, 1.6, 9.6, 6.8, 2.8, 0.2, 61, {}, "½ cup (70 g)", "Dietary nitrates improve blood flow & exercise endurance — athletes' secret."),
  F("tomato", "Tomato", "🍅", "Vegetables", 18, 0.9, 3.9, 2.6, 1.2, 0.2, 15, {}, "1 medium (100 g)", "Lycopene absorption rises 4× when cooked with a little oil."),
  F("cucumber", "Cucumber", "🥒", "Vegetables", 15, 0.7, 3.6, 1.7, 0.5, 0.1, 15, {}, "½ cup (100 g)", "96% water — volume eating with almost zero calorie cost."),
  F("capsicum", "Bell pepper (capsicum)", "🫑", "Vegetables", 26, 1.0, 6.0, 4.2, 2.1, 0.3, 15, {}, "½ cup (75 g)", "More vitamin C than an orange, gram for gram."),
  F("okra", "Okra (bhindi)", "🌿", "Vegetables", 33, 1.9, 7.5, 1.5, 3.2, 0.2, 15, {}, "1 cup (100 g)", "Mucilaginous fibre slows glucose absorption — traditional diabetic-friendly veg."),
  F("bitter_gourd", "Bitter gourd (karela)", "🥒", "Vegetables", 17, 1.0, 3.7, 1.8, 2.8, 0.2, 15, {}, "½ cup (50 g)", "Charantin & polypeptide-P give it genuine glucose-lowering properties."),
  F("methi_leaves", "Methi (fenugreek leaves)", "🌿", "Vegetables", 49, 4.4, 6.5, 0.9, 3.9, 0.9, 15, {}, "1 katori (60 g)", "4-hydroxyisoleucine in methi directly improves insulin sensitivity."),
  F("cabbage", "Cabbage (patta gobi)", "🥬", "Vegetables", 25, 1.3, 5.8, 3.2, 2.5, 0.1, 10, {}, "1 cup (90 g)", "Ferment it (kimchi/cohaju) for probiotics + prebiotics in one."),
  F("mushroom", "Mushrooms", "🍄", "Vegetables", 22, 3.1, 3.3, 2.0, 1.0, 0.3, 15, {}, "1 cup (70 g)", "Only non-animal umami source with vitamin D when sun-exposed."),
  F("green_beans", "French beans", "🌿", "Vegetables", 31, 1.8, 7.0, 1.5, 2.7, 0.2, 15, {}, "1 cup (100 g)", "Silicon + vitamin K — quiet supporters of bone health."),
  F("sweet_potato", "Sweet potato (boiled)", "🍠", "Vegetables", 86, 1.6, 20.1, 4.2, 3.0, 0.1, 63, {}, "1 medium (130 g)", "Boiling keeps GI moderate; baking pushes it above 90 — choose boiling."),
  F("potato", "Potato (boiled)", "🥔", "Vegetables", 87, 1.9, 20.1, 0.9, 1.8, 0.1, 78, {}, "1 medium (130 g)", "High GI but also one of the most satiating foods — cool first, then reheat."),
  F("pumpkin", "Pumpkin (kaddu)", "🎃", "Vegetables", 26, 1.0, 6.5, 2.8, 0.5, 0.1, 75, {}, "1 katori (100 g)", "Nutritious but high-GI — fine in normal portions for most people."),

  // ── Fruits ──
  F("apple", "Apple", "🍎", "Fruits", 52, 0.3, 13.8, 10.4, 2.4, 0.2, 36, {}, "1 medium (180 g)", "Pectin fibre feeds Akkermansia muciniphila — a gut bug linked to leanness."),
  F("banana", "Banana (ripe)", "🍌", "Fruits", 89, 1.1, 22.8, 12.2, 2.6, 0.3, 51, {}, "1 medium (120 g)", "Pre-workout fuel; slightly green = more resistant starch, lower GI."),
  F("orange", "Orange", "🍊", "Fruits", 47, 0.9, 11.8, 9.4, 2.4, 0.1, 43, {}, "1 medium (140 g)", "Always whole, never juice — the fibre matrix is the entire point."),
  F("papaya", "Papaya", "🥭", "Fruits", 43, 0.5, 10.8, 7.8, 1.7, 0.3, 59, {}, "1 cup cubes (140 g)", "Papain aids protein digestion — great after a heavy meal."),
  F("guava", "Guava", "💚", "Fruits", 68, 2.6, 14.3, 9.0, 5.4, 1.0, 12, {}, "1 medium (100 g)", "Fibre king of fruits with 4× the vitamin C of an orange, at very low GI."),
  F("mango", "Mango", "🥭", "Fruits", 60, 0.8, 15.0, 13.7, 1.6, 0.4, 51, {}, "½ cup (80 g)", "Delicious, portion-controlled — think 'tasting portion', not meal."),
  F("watermelon", "Watermelon", "🍉", "Fruits", 30, 0.6, 7.6, 6.2, 0.4, 0.2, 72, {}, "1 cup (150 g)", "High GI but tiny sugar load per serving (low GL) — hydration fruit."),
  F("grapes", "Grapes", "🍇", "Fruits", 69, 0.7, 18.0, 15.5, 0.9, 0.2, 53, {}, "¾ cup (100 g)", "Resveratrol lives in the skin; freeze them for portion-controlled sweets."),
  F("pomegranate", "Pomegranate", "🔴", "Fruits", 83, 1.7, 18.7, 13.7, 4.0, 1.2, 35, {}, "½ cup arils (90 g)", "Punicalagins are among the most potent dietary antioxidants measured."),
  F("strawberry", "Strawberries", "🍓", "Fruits", 32, 0.7, 7.7, 4.9, 2.0, 0.3, 41, {}, "½ cup (75 g)", "Low sugar, high polyphenols — the diabetes-friendly berry."),
  F("blueberry", "Blueberries", "🫐", "Fruits", 57, 0.7, 14.5, 10.0, 2.4, 0.3, 53, {}, "½ cup (75 g)", "Anthocyanins measurably improve insulin sensitivity in trials."),
  F("jamun", "Jamun (java plum)", "🟣", "Fruits", 62, 0.7, 14.5, 9.0, 1.5, 0.3, 25, {}, "½ cup (75 g)", "Traditional diabetic fruit with one of the lowest GIs measured in Indian fruits."),

  // ── Dairy & Alternatives ──
  F("paneer", "Paneer (fresh)", "🧈", "Dairy & Alternatives", 265, 18.3, 1.2, 1.0, 0.0, 20.8, 0, { vegan: false, lactose: true }, "2 cubes (60 g)", "Slow-digesting casein — ideal evening protein for overnight muscle repair."),
  F("greek_yogurt", "Greek yogurt (plain)", "🥛", "Dairy & Alternatives", 59, 10.2, 3.6, 3.2, 0.0, 0.4, 11, { vegan: false, lactose: true }, "1 small bowl (150 g)", "Strained = double protein, live cultures for the gut. The single best dairy swap."),
  F("curd", "Curd / dahi", "🥛", "Dairy & Alternatives", 60, 3.5, 4.7, 4.7, 0.0, 3.3, 14, { vegan: false, lactose: true }, "1 katori (150 g)", "Probiotic staple; cultures pre-digest some lactose, so often better tolerated."),
  F("toned_milk", "Toned milk", "🥛", "Dairy & Alternatives", 58, 3.1, 4.9, 4.8, 0.0, 2.6, 31, { vegan: false, lactose: true }, "1 glass (200 ml)", "Everyday milk with a third less fat than full-cream."),
  F("cheese", "Cheese (cheddar)", "🧀", "Dairy & Alternatives", 402, 25.0, 1.3, 0.5, 0.0, 33.0, 0, { vegan: false, lactose: true }, "1 slice (20 g)", "Protein-dense but calorie-dense too — treat as a flavour, not a food group."),
  F("soy_milk", "Soy milk (unsweetened)", "🌱", "Dairy & Alternatives", 38, 3.3, 2.5, 1.0, 0.4, 2.0, 34, {}, "1 glass (200 ml)", "Closest plant milk to dairy's protein content — avoid sweetened versions."),
  F("almond_milk", "Almond milk (unsweetened)", "🌰", "Dairy & Alternatives", 15, 0.6, 0.6, 0.0, 0.3, 1.2, 25, { nuts: true }, "1 glass (200 ml)", "Very low calorie, but almost no protein — don't use it as a protein source."),
  F("buttermilk", "Buttermilk (chaas)", "🥛", "Dairy & Alternatives", 40, 1.9, 4.0, 3.8, 0.0, 1.0, 14, { vegan: false, lactose: true }, "1 glass (200 ml)", "Cooling probiotic with almost no fat — the ideal Indian summer drink."),

  // ── Eggs, Meat & Fish ──
  F("egg", "Whole egg (boiled)", "🥚", "Eggs, Meat & Fish", 155, 13.0, 1.1, 1.1, 0.0, 11.0, 0, { vegan: false, vegetarian: false, eggs: true }, "1 large (50 g)", "The gold-standard protein (BV 100) — choline for the brain, lutein for eyes."),
  F("egg_white", "Egg white", "⚪", "Eggs, Meat & Fish", 52, 11.0, 0.7, 0.7, 0.0, 0.2, 0, { vegan: false, vegetarian: false, eggs: true }, "2 whites (66 g)", "Pure protein, zero fat — perfect for boosting protein without calories."),
  F("chicken_breast", "Chicken breast (skinless, cooked)", "🍗", "Eggs, Meat & Fish", 165, 31.0, 0.0, 0.0, 0.0, 3.6, 0, { vegan: false, vegetarian: false }, "1 piece (100 g)", "31 g protein at just 3.6 g fat — the bodybuilder's benchmark."),
  F("chicken_thigh", "Chicken thigh (skinless)", "🍗", "Eggs, Meat & Fish", 177, 23.0, 0.0, 0.0, 0.0, 8.5, 0, { vegan: false, vegetarian: false }, "1 piece (90 g)", "Juicier cut with more iron & zinc — fine within calories."),
  F("salmon", "Salmon (cooked)", "🐟", "Eggs, Meat & Fish", 208, 20.0, 0.0, 0.0, 0.0, 13.0, 0, { vegan: false, vegetarian: false }, "1 fillet (120 g)", "EPA/DHA omega-3 at its best — 2 servings/week is the evidence-based dose."),
  F("mackerel", "Bangda (Indian mackerel)", "🐟", "Eggs, Meat & Fish", 161, 19.0, 0.0, 0.0, 0.0, 9.0, 0, { vegan: false, vegetarian: false }, "1 piece (100 g)", "Affordable local omega-3 — as good as imported fish, far cheaper."),
  F("sardine", "Sardines (pedvey)", "🐟", "Eggs, Meat & Fish", 208, 25.0, 0.0, 0.0, 0.0, 11.0, 0, { vegan: false, vegetarian: false }, "2–3 pieces (90 g)", "Tiny fish, big nutrition: omega-3 + calcium (soft bones) + virtually no mercury."),
  F("prawns", "Prawns", "🦐", "Eggs, Meat & Fish", 99, 24.0, 0.2, 0.0, 0.0, 0.3, 0, { vegan: false, vegetarian: false }, "½ cup (85 g)", "Leanest animal protein in the sea — 24 g protein under 100 kcal."),
  F("tuna", "Tuna (canned in water)", "🐟", "Eggs, Meat & Fish", 116, 26.0, 0.0, 0.0, 0.0, 1.0, 0, { vegan: false, vegetarian: false, processed: true }, "1 can (100 g)", "Pantry protein hero; limit to 2–3 cans/week for mercury caution."),
  F("mutton_lean", "Mutton (lean cuts, cooked)", "🍖", "Eggs, Meat & Fish", 143, 27.0, 0.0, 0.0, 0.0, 3.9, 0, { vegan: false, vegetarian: false }, "2 pieces (100 g)", "Iron + B12 powerhouse — choose lean cuts, trim visible fat."),

  // ── Nuts & Seeds ──
  F("almonds", "Almonds (badam)", "🌰", "Nuts & Seeds", 579, 21.2, 21.6, 4.4, 12.5, 49.9, 15, { nuts: true }, "1 handful (28 g)", "Vitamin E + magnesium + fibre; the 23-almonds-a-day snack has real trial evidence."),
  F("walnuts", "Walnuts (akhrot)", "🌰", "Nuts & Seeds", 654, 15.2, 13.7, 2.6, 6.7, 65.2, 15, { nuts: true }, "3 halves (28 g)", "Plant omega-3 (ALA) champion — brain-shaped and brain-friendly."),
  F("peanuts", "Peanuts (moongphali)", "🥜", "Nuts & Seeds", 567, 25.8, 16.1, 4.7, 8.5, 49.2, 14, { nuts: true }, "1 handful (28 g)", "The cheapest quality protein in India — technically a legume with a nut's profile."),
  F("chia", "Chia seeds", "⚫", "Nuts & Seeds", 486, 16.5, 42.1, 0.0, 34.4, 30.7, 15, {}, "1 tbsp (12 g)", "34 g fibre per 100 g — a spoon in yogurt or water transforms satiety."),
  F("flaxseed", "Flaxseeds (alsi)", "🟤", "Nuts & Seeds", 534, 18.3, 28.9, 1.6, 27.3, 42.2, 15, {}, "1 tbsp ground (10 g)", "Grind fresh — whole seeds pass undigested. Lignans + omega-3 for hormones."),
  F("pumpkin_seeds", "Pumpkin seeds", "🎃", "Nuts & Seeds", 559, 30.2, 10.7, 1.4, 6.0, 49.0, 25, {}, "2 tbsp (20 g)", "30 g protein + highest zinc of any seed — immune and testosterone support."),
  F("sesame", "Sesame seeds (til)", "⚪", "Nuts & Seeds", 573, 17.7, 23.4, 0.3, 11.8, 49.7, 25, {}, "1 tbsp (9 g)", "Calcium (975 mg/100 g) — the traditional winter laddoo had a point."),
  F("sunflower_seeds", "Sunflower seeds", "🌻", "Nuts & Seeds", 584, 20.8, 20.0, 2.6, 8.6, 51.5, 25, {}, "2 tbsp (18 g)", "Vitamin E heavyweight — one serving covers most of your daily need."),
  F("pb_natural", "Peanut butter (natural)", "🥜", "Nuts & Seeds", 588, 25.0, 19.6, 5.5, 6.0, 50.4, 14, { nuts: true }, "1 tbsp (16 g)", "Buy the 2-ingredient kind (peanuts + salt). Great muscle-gain calories."),

  // ── Fats & Oils ──
  F("ghee", "Ghee", "🧴", "Fats & Oils", 900, 0.0, 0.0, 0.0, 0.0, 100.0, 0, { vegan: false }, "1 tsp (5 g)", "Butyrate-rich and lactose-free; flavour enhancer at 1 tsp, not 1 tbsp."),
  F("olive_oil", "Extra-virgin olive oil", "🫒", "Fats & Oils", 884, 0.0, 0.0, 0.0, 0.0, 100.0, 0, {}, "1 tbsp (14 g)", "The Mediterranean pillar — polyphenols survive only in extra-virgin."),
  F("mustard_oil", "Mustard oil (kachi ghani)", "🟡", "Fats & Oils", 884, 0.0, 0.0, 0.0, 0.0, 100.0, 0, {}, "1 tbsp (14 g)", "Balanced omega-3/6 and a high smoke point — a smart everyday Indian choice."),
  F("coconut_oil", "Coconut oil", "🥥", "Fats & Oils", 892, 0.0, 0.0, 0.0, 0.0, 99.0, 0, {}, "1 tsp (5 g)", "MCTs burn quickly as fuel, but it's still ~90% saturated — measure, don't pour."),
  F("avocado", "Avocado", "🥑", "Fats & Oils", 160, 2.0, 8.5, 0.7, 6.7, 14.7, 15, {}, "½ fruit (100 g)", "Potassium beats banana; monounsaturated fat blunts the GI of any meal."),
  F("butter", "Butter (makhan)", "🧈", "Fats & Oils", 717, 0.9, 0.1, 0.1, 0.0, 81.0, 0, { vegan: false, lactose: true }, "1 tsp (5 g)", "Mostly saturated fat — ghee or olive oil are better everyday choices."),

  // ── Drinks ──
  F("green_tea", "Green tea", "🍵", "Drinks", 1, 0.0, 0.2, 0.0, 0.0, 0.0, 0, {}, "1 cup (200 ml)", "Catechins (EGCG) + L-theanine: calm alertness with a mild metabolic edge."),
  F("black_coffee", "Black coffee", "☕", "Drinks", 2, 0.1, 0.0, 0.0, 0.0, 0.0, 0, {}, "1 cup (150 ml)", "Performance-enhancing and nearly calorie-free — just don't drink it after 4 pm."),
  F("coconut_water", "Coconut water (nariyal pani)", "🥥", "Drinks", 19, 0.7, 3.7, 2.6, 1.1, 0.2, 3, {}, "1 glass (200 ml)", "Nature's electrolyte drink — potassium-rich, far better than sports drinks."),
  F("cola", "Cola / soft drink", "🥤", "Drinks", 42, 0.0, 10.6, 10.6, 0.0, 0.0, 63, { processed: true }, "1 can (330 ml)", "35 g of sugar in one can — the single easiest item to delete for visceral fat."),

  // ── Snacks & Sweets ──
  F("dark_chocolate", "Dark chocolate (85%)", "🍫", "Snacks & Sweets", 598, 7.8, 45.9, 24.0, 10.9, 42.6, 23, {}, "2 squares (20 g)", "Flavanols support blood pressure — 85%+ keeps sugar low. Two squares, not a bar."),
  F("milk_chocolate", "Milk chocolate", "🍫", "Snacks & Sweets", 535, 7.6, 59.4, 51.5, 3.4, 29.7, 45, { processed: true }, "1 bar (45 g)", "Half sugar by weight — a 'sometimes' food at best."),
  F("biscuits", "Marie / cream biscuits", "🍪", "Snacks & Sweets", 450, 7.0, 75.0, 22.0, 2.0, 12.0, 70, { gluten: true, processed: true }, "4 biscuits (30 g)", "Maida + sugar + palm oil — the tea-time trifecta worth breaking up with."),
  F("chips", "Potato chips", "🍟", "Snacks & Sweets", 536, 6.6, 53.0, 0.3, 3.8, 34.0, 56, { processed: true }, "1 small pack (30 g)", "Engineered to be overeaten — salt + fat + crunch overrides satiety signals."),
  F("samosa", "Samosa", "🥟", "Snacks & Sweets", 308, 5.0, 32.0, 2.0, 2.4, 18.0, 60, { gluten: true, processed: true }, "1 medium (60 g)", "Deep-fried maida — delicious, but a visceral-fat accelerant."),
  F("gulab_jamun", "Gulab jamun", "🍮", "Snacks & Sweets", 336, 4.4, 47.0, 40.0, 0.5, 15.0, 60, { processed: true }, "1 piece (40 g)", "Sugar syrup + fried khoya — save for true celebrations, not daily cravings."),
  F("honey", "Honey (shahad)", "🍯", "Snacks & Sweets", 304, 0.3, 82.4, 82.1, 0.2, 0.0, 58, {}, "1 tsp (7 g)", "Natural ≠ metabolically different — it's still sugar. Use as medicine, not staple."),
  F("sugar", "White sugar (cheeni)", "⚪", "Snacks & Sweets", 387, 0.0, 100.0, 100.0, 0.0, 0.0, 65, { processed: true }, "1 tsp (4 g)", "Pure energy with zero nutrition — WHO advises under 6 tsp/day, total."),
];

export const FOOD_CATEGORIES: Food["category"][] = [
  "Grains & Millets",
  "Legumes & Pulses",
  "Vegetables",
  "Fruits",
  "Dairy & Alternatives",
  "Eggs, Meat & Fish",
  "Nuts & Seeds",
  "Fats & Oils",
  "Drinks",
  "Snacks & Sweets",
];
