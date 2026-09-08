// ─── NourishIQ Evidence Library ─────────────────────────────────────────────
// Guidance grounded in: ICMR-NIN RDA 2024 (India), WHO guidelines (sugar 2015,
// salt 2020, physical activity 2020), American Diabetes Association GI classes,
// and current protein/fibre literature.
// ─────────────────────────────────────────────────────────────────────────────

import type { GoalId, BoosterId, ExclusionId } from "./types";

export interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  tint: string;
  items: string[];
}

export const UNIVERSAL_PRINCIPLES: GuideSection = {
  id: "universal",
  title: "The 10 Laws Every Nutritionist Swears By",
  subtitle: "Universal principles · WHO & ICMR-NIN aligned",
  tint: "bg-[#E4F6EE]",
  items: [
    "The Half-Plate Rule: every main meal = ½ vegetables, ¼ protein, ¼ smart carbs. It auto-corrects calories, GI and fibre without counting anything.",
    "Protein at every meal (25–35 g): muscle, immunity and satiety all run on protein — and the body stores none of it. Spread it across the day, don't binge at dinner.",
    "WHO sugar limit: < 10% of daily energy, ideally < 5% (that's ~25 g ≈ 6 tsp for a 2000 kcal day). Watch 'hidden' sugar in ketchup, flavoured curd, breakfast cereals.",
    "Salt < 5 g/day (one teaspoon, TOTAL). 75% of it hides in papads, pickles, chips, bakery and restaurant food — not your salt shaker.",
    "Fibre ≥ 25–30 g/day from real food: beans, vegetables, fruit, millets, nuts. Fibre is the single strongest predictor of gut and metabolic health in cohort studies.",
    "Hydration 30–35 ml/kg: a 70 kg adult needs ~2.3–2.5 L. Mild dehydration is routinely mistaken for hunger and fatigue.",
    "Eat 30+ different plant foods per week — the American Gut Project found this variety matters more than being strictly vegan or keto for microbiome diversity.",
    "WHO movement minimum: 150–300 min moderate cardio weekly + 2 resistance sessions. Muscle is the organ of longevity — resistance work is non-negotiable after 35.",
    "Sleep 7–9 h. One week of 5-hour nights reduces insulin sensitivity by ~25% and spikes hunger hormones (ghrelin ↑, leptin ↓).",
    "The 80/20 principle: eat whole foods 80% of the time, enjoy anything guilt-free 20%. Perfect diets fail; consistent-adequate ones win.",
  ],
};

export const GOAL_GUIDES: Record<GoalId, GuideSection> = {
  muscle_gain: {
    id: "muscle_gain",
    title: "Muscle Gain Protocol",
    subtitle: "Hypertrophy nutrition, evidence-based",
    tint: "bg-[#E4F6EE]",
    items: [
      "Surplus of +250–350 kcal/day above TDEE. Bigger surpluses mostly add fat, not muscle — 'dirty bulking' is a myth you pay for in the cutting phase.",
      "Protein 1.6–2.2 g/kg/day (more shows no added benefit). For an 70 kg lifter: 115–155 g, split over 4 meals of 30–40 g.",
      "Hit the leucine threshold: each meal should include a complete protein — eggs, chicken, fish, paneer, soy chunks, curd + dal combo.",
      "Pre/post training: 1–1.5 g/kg carbs around the workout (banana, oats, rice) + 25–30 g protein within 2 h after.",
      "Creatine monohydrate 3–5 g/day is the most-researched, safest legal ergogenic aid — optional but genuinely useful.",
      "Progressive overload drives growth; food only permits it. Without increasing weights/reps, no surplus will sculpt muscle.",
      "Expect 0.25–0.5 kg/month of real muscle for naturals. Weigh weekly, track lifts monthly — the mirror lags the logbook.",
    ],
  },
  weight_loss: {
    id: "weight_loss",
    title: "Sustainable Fat-Loss Protocol",
    subtitle: "Deficit done clinically, not crash-style",
    tint: "bg-[#F3EAF8]",
    items: [
      "Deficit of 400–500 kcal/day ≈ 0.4–0.5 kg/week. Faster losses sacrifice muscle and crash your metabolism — patience is the hack.",
      "Protein 1.6–1.8 g/kg protects lean mass in a deficit; it also has the highest thermic effect (20–30% of its calories burn in digestion).",
      "Volume eating: foods with high water + fibre (soups, salads, vegetables, fruit) fill the stomach for minimal calories. Hunger is a volume problem, not a calorie problem.",
      "Liquid calories bypass satiety entirely — delete juice, sweet chai lattes, colas first. One daily cola = 1.2 kg fat potential per month.",
      "NEAT (non-exercise activity) can burn 300–800 kcal/day more in lean individuals — 8,000+ steps is your silent fat-loss engine.",
      "Track weekly average weight, not daily numbers (water swings 1–2 kg with salt, carbs and cycles).",
      "Plan maintenance from day one: diets you can't see yourself on in 5 years don't work. All-or-nothing thinking is the #1 predictor of regain.",
    ],
  },
  weight_gain: {
    id: "weight_gain",
    title: "Healthy Weight-Gain Protocol",
    subtitle: "Adding mass without junk",
    tint: "bg-[#EAF4E2]",
    items: [
      "Surplus of +300–450 kcal/day ≈ 0.25–0.5 kg/week gain. Faster gain on a small frame is mostly fat.",
      "Eat 5–6 times daily: 3 meals + 2–3 dense snacks. Smaller frequent meals beat forcing giant plates.",
      "Calorie-dense allies: nut butters (100 kcal/tbsp), ghee on dal, full-fat milk, banana + milk shakes, trail mixes, cheese.",
      "Drink your calories when appetite fails: milk-based smoothies with oats, PB and banana are the classic hard-gainer weapon.",
      "Resistance train 3–4×/week so the surplus builds muscle, not just belly. Untrained surplus = fat storage.",
      "Weigh every week same time same clothes. If the scale is flat for 2 weeks, add 200 kcal and reassess.",
      "Rule out the silent causes of thinness: thyroid hyperfunction, malabsorption, worms, diabetes onset — get a basic panel if gain stays impossible.",
    ],
  },
  visceral_fat: {
    id: "visceral_fat",
    title: "Visceral Fat & Metabolic Reset",
    subtitle: "The protocol for belly fat, fatty liver & insulin resistance",
    tint: "bg-[#FCEFD9]",
    items: [
      "Visceral fat is hormonally active — it drives insulin resistance, fatty liver, triglycerides and inflammation. The good news: it responds to diet faster than subcutaneous fat (often visible change in 6–8 weeks).",
      "First target: sugar-sweetened beverages & fruit juice. Liquid fructose is the single most liver-visceral nutrient studied. Zero drinks, zero excuses.",
      "Go low-GI: carbs ≤ 55 GI (millets, dals, cooled rice, sweet potato boiled). Swap 2 refined-carb meals/day and waist measurement moves within a month.",
      "Protein 2.0 g/kg in a moderate 400-kcal deficit preserves muscle while the body raids visceral stores. Never crash-diet — losing muscle worsens insulin resistance.",
      "Soluble fibre 10 g+/day (oats beta-glucan, psyllium isabgol, legumes, guava) binds bile and measurably reduces visceral accumulation in trials.",
      "Fats: keep to ~35% energy, mostly MUFA (nuts, olive/mustard oil, avocado). Trans fats specifically redistribute fat to the abdomen — read labels for 'hydrogenated'.",
      "Exercise stack: 150+ min/week brisk walking (Zone-2) + 2 sessions of intervals or full-body resistance. Spot reduction is a myth; systemic fat loss + muscle is the mechanism.",
      "Sleep < 6 h and chronic stress (cortisol) both preferentially deposit visceral fat. A 7.5-h sleep target and daily 10-min walks after meals are clinical-grade interventions.",
      "South-Asian targets: waist < 90 cm (men), < 80 cm (women). Get HbA1c, lipids, ALT and a lipid-profile panel checked at baseline and 3 months.",
    ],
  },
  protein_rich: {
    id: "protein_rich",
    title: "Protein-Optimised Eating",
    subtitle: "Hitting 1.6–2 g/kg without supplements",
    tint: "bg-[#FBF3E2]",
    items: [
      "Target 1.6–2.0 g/kg/day. For a 65 kg adult that's 104–130 g — achievable with food alone if every meal is built around protein first.",
      "Indian veg hit-list: soy chunks 52 g/100 g, paneer 18 g, moong dal 7 g cooked, Greek yogurt 10 g, peanuts 26 g, tofu 8 g — combine 2–3 per meal.",
      "Non-veg hit-list: chicken breast 31 g/100 g, prawns 24 g, eggs 13 g whole / 11 g per white, fish 19–26 g.",
      "The 'anchor' method: decide the protein of each meal BEFORE anything else (breakfast: eggs or Greek yogurt; lunch: dal + paneer; dinner: chicken/tofu), then build around it.",
      "Pairing rule: legumes + grains (dal-rice, chilla-chutney, rajma-rice) create complete amino-acid profiles — no, they don't need to be in the same bite, just the same day.",
      "Very high protein (> 2.2 g/kg long-term) offers no extra muscle benefit; healthy kidneys handle up to ~2.8 g/kg fine in trials, but there's no upside past 2.2.",
      "If lactose-intolerant: lactose-free milk, curd (better tolerated), tofu, soy milk — never let dairy trouble silently shrink your protein intake.",
    ],
  },
  optimal_health: {
    id: "optimal_health",
    title: "Optimal Health Blueprint",
    subtitle: "The Mediterranean-meets-Indian pattern",
    tint: "bg-[#EFEFED]",
    items: [
      "Base pattern: mostly plants + fish, olive/mustard oil as primary fat, dairy in moderation, red meat rare — the most-studied longevity diet on earth, and it maps beautifully onto traditional Indian home food.",
      "The rainbow rule: 3 colours of vegetables/fruit daily. Pigment = phytonutrient class (red lycopene, purple anthocyanins, orange carotenoids).",
      "Omega-3 twice a week: fish, walnuts, flax, chia. The Indian vegetarian diet is chronically omega-3-poor — this is the #1 fixable gap.",
      "Annual blood work after 30: HbA1c, lipid profile, vitamin D, B12, thyroid, ferritin. India's D/B12 deficiency rates (70–80%) make supplements a data-driven decision, not guesswork.",
      "Vitamin D: 15–20 min midday sun on arms/face, 3–4×/week; supplement 1000–2000 IU in winter/indoor lifestyles if levels < 30 ng/ml.",
      "Cook more than you order. Home-cooked meals average 200–500 fewer calories, half the sodium, and no trans fats versus restaurant equivalents.",
      "Meal timing matters less than meal composition, but a 12-h overnight fast (e.g., dinner 8 pm → breakfast 8 am) aligns with circadian glucose handling.",
      "Health is a team sport: eat with family, walk after meals with people you like. Blue-zone research keeps showing connection is as metabolic as macronutrients.",
    ],
  },
};

export const BOOSTER_GUIDES: Record<BoosterId, GuideSection> = {
  low_gi: {
    id: "low_gi",
    title: "Low-GI Smart-Carb Guide",
    subtitle: "Glycemic control without carb-phobia",
    tint: "bg-[#F3EAF8]",
    items: [
      "GI classes: Low ≤ 55 (eat freely), Medium 56–69 (portion), High ≥ 70 (limit). But GI is per 50 g carbs — watermelon is high-GI yet low-GL because a serving carries little sugar.",
      "Pairing beats avoidance: carbs eaten with protein, fat, fibre or acid (lemon, vinegar) digest slower. Rice + dal + salad beats 'no rice' for adherence and glucose.",
      "Cook-and-cool trick: chilling cooked rice/potato converts starch to resistant starch, cutting effective GI by 10–15 points. Reheating keeps the benefit.",
      "Choose intact grains: millets (ragi 54, jowar 52, foxtail 50), dals (24–33), pasta al dente (48), oats (55). Flour fineness raises GI — the finer the grind, the faster the spike.",
      "Whole fruit yes, juice no: an orange is GI 43 with fibre; its juice is GI ~50–57 with the fibre removed and 3 oranges' sugar in one glass.",
      "Eat order experiment (small trials, promising): vegetables/protein first, carbs last can cut the post-meal glucose peak by up to 30–40%.",
      "Walk 10 minutes after main meals — post-meal walking clears glucose faster than any pre-meal hack.",
    ],
  },
  high_fibre: {
    id: "high_fibre",
    title: "High-Fibre Commandments",
    subtitle: "30 g+/day, the forgotten 'nutrient of the decade'",
    tint: "bg-[#EAF4E2]",
    items: [
      "Fibre classes: soluble (oats, dals, guava, isabgol — lowers LDL, feeds gut bacteria, blunts glucose) vs insoluble (veg skins, whole grains — keeps you regular). You need both, from food.",
      "Indian reality check: average intake is ~15 g/day — half the target. The gap, not genetics, explains much of our metabolic-disease burden.",
      "Ramp up over 3–4 weeks, not overnight — sudden jumps cause bloating. Add 5 g/week while increasing water (fibre without water = concrete).",
      "Top-10 Indian fibre sources: soy chunks 13 g, chia 34 g, flax 27 g, rajma 6.4 g, guava 5.4 g, ragi 11 g, almonds 12 g, green peas 5.7 g, besan 10.8 g, methi leaves.",
      "The 'first course' trick: start lunch/dinner with a salad or veg soup — the fibre-first arrival slows everything eaten after it.",
      "Every gram of soluble fibre feeds short-chain-fatty-acid production (butyrate), which reduces systemic inflammation — the quiet mechanism behind fibre's disease-risk reductions.",
      "Lancet meta-analysis (2019, 185 studies): 25–29 g/day cuts all-cause mortality, heart disease, stroke, diabetes and colorectal cancer risk by 15–30%. Nothing else on the plate does that.",
    ],
  },
};

export const EXCLUSION_GUIDES: Record<ExclusionId, GuideSection> = {
  gluten_free: {
    id: "gluten_free",
    title: "Gluten-Free, Done Right",
    subtitle: "For coeliac disease & gluten sensitivity",
    tint: "bg-[#FCEFD9]",
    items: [
      "Hidden gluten hit-list: soy sauce (use tamari), malt & malt vinegar, couscous, sev/bhujia coatings, thickeners in soups & gravies, communion wafers, some ice creams & spice blends.",
      "Oats are naturally gluten-free but cross-contaminated in mills — only 'certified gluten-free' oats qualify for coeliacs.",
      "Naturally GF Indian grains are a superpower: rice, all millets (ragi/jowar/bajra/foxtail), amaranth (rajgira), buckwheat (kuttu), besan, singhara — the Navratri fasting pantry is a coeliac goldmine.",
      "A GF diet done with packaged 'GF' products is often WORSE (more sugar, less fibre). Build it on naturally GF whole foods instead.",
      "Check labels for 'may contain wheat' if coeliac — cross-contact thresholds matter (Codex: < 20 ppm).",
      "After starting GF, common deficiencies to watch: fibre, iron, folate, B12 — because many wheat products were fortified. Compensate with dals, leafy greens and seeds.",
    ],
  },
  lactose_free: {
    id: "lactose_free",
    title: "Lactose-Smart Dairy Strategy",
    subtitle: "Keep calcium & protein, drop the trouble",
    tint: "bg-[#E4F6EE]",
    items: [
      "Lactose intolerance is dose-dependent, not binary — most people handle 100–150 ml milk with food, or hard cheeses & curd comfortably.",
      "Best-tolerated first: ghee & butter (≈zero lactose) → aged cheese → curd/yogurt (cultures pre-digest lactose) → lactose-free milk → plant milks.",
      "Non-dairy calcium stack: ragi (344 mg/100 g), sesame/til (975 mg), almonds (269 mg), rajma, tofu set with calcium, green leafy veg — meet the 1000 mg/day adult RDA without milk.",
      "Plant milk trap: almond/oat milk have almost no protein (0.5–1 g vs 3.3 g in milk). Choose soy milk (3+ g) if milk leaves the plan.",
      "B12 note: strict dairy avoidance on a vegetarian diet needs a B12 strategy (fortified foods or supplement) — deficiency is common and irreversible if late.",
    ],
  },
  nut_allergy: {
    id: "nut_allergy",
    title: "Nut-Allergy Safety Sheet",
    subtitle: "Strict avoidance without nutrient loss",
    tint: "bg-[#FBF3E2]",
    items: [
      "Hidden nut sources: bakery, chocolates, granola, pesto, some oils (peanut), nougat, 'natural flavourings', cross-contact warnings on cereals.",
      "Replace protein/nutrients lost: peanuts & almonds → pumpkin seeds, sunflower seeds, chia, flax, sesame (if tolerated), soy, eggs, fish, paneer.",
      "Always read 'may contain traces' warnings — for true IgE allergies these are genuine risk statements, not legal fine print.",
      "Seed butters (sunflower/pumpkin) mimic nut-butter calories & texture safely for smoothies and toasts.",
      "Carry your emergency plan (antihistamine/Epipen if prescribed) — nutrition guidance never replaces your allergy action plan.",
    ],
  },
};

export const NIN_RDA: GuideSection = {
  id: "nin_rda",
  title: "ICMR-NIN 2024 Reference (India)",
  subtitle: "Recommended daily amounts, sedentary adults — indicative",
  tint: "bg-[#EFEFED]",
  items: [
    "Protein: 0.83 g/kg body weight (safe level for all adults) ≈ 54 g for a 65 kg adult. This is the FLOOR — active people, dieters and elders do better at 1.2–2.0 g/kg.",
    "Visible fat: ~25–30 g/day (women/men) — total fat 20–30% of energy, saturated < 7–10%.",
    "Fibre: ≈ 30 g/2000 kcal (or 25–32 g/day). Practically: 5 servings fruit+veg, 2 whole-grain meals, 1 handful nuts gets you there.",
    "Added sugar: < 5% of energy (NIN is stricter than WHO's 10% 'ideal <5%') ≈ 25 g for 2000 kcal — about 6 teaspoons.",
    "Salt: < 5 g/day (WHO). Indian average is 8–11 g — nearly double, and the main driver of hypertension at population level.",
    "Water: ~35 ml/kg/day ≈ 2.3 L (65 kg adult), more in heat/exercise. Thirst lags need, especially after 60.",
    "Calcium: 1000 mg/day adults (NIN 2024 raised it); Iron: 11 mg (men) / 18 mg (women, pre-menopause); B12: 2.4–2.5 µg — the three most common Indian gaps alongside vitamin D.",
    "This app's prescriptions start from these reference values, then personalise for your goal, body metrics and needs.",
  ],
};

export const GI_REFERENCE: GuideSection = {
  id: "gi_reference",
  title: "GI Quick-Reference Table",
  subtitle: "American Diabetes Association classes, everyday foods",
  tint: "bg-[#F3EAF8]",
  items: [
    "LOW (≤ 55) — prefer: dals 24–33, rajma 24, kala chana 28, soy chunks 15, pasta al dente 48, oats 55, apples 36, oranges 43, guava 12, jamun 25, pomegranate 35, carrots 39.",
    "MEDIUM (56–69) — portion & pair: chapati 62, brown rice 68, idli 68, sweet potato boiled 63, papaya 59, poha? (higher when plain), banana 51 (ripe — borderline).",
    "HIGH (≥ 70) — limit/swap: white rice 73, potato 78, white bread 75, watermelon 72, biscuits 70, poha plain 72, dosa 70, cornflakes ~81.",
    "Note how Indian staples split: dal-rice is a mixed GI meal — the dal, fibre and protein pull the effective glycemic load down. You rarely eat GI in isolation.",
    "Higher context = lower spike. Same carb + veg + protein + vinegar/lemon + a walk after = dramatically flatter curve. That's the skill a nutritionist actually coaches.",
  ],
};
