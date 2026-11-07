import { priceIngredients, type Ulam, type UlamKind } from "@/supabase/functions/_shared/ulam";
import { checkedPhoto } from "@/supabase/functions/_shared/ulam-photos";

// Shown when today's row is missing (Groq failed, or the job has not run), so the screen always
// has an ulam. Costs come from the shared price list. Calories are estimates.

type Recipe = { name: string; kind: UlamKind; ids: string[]; cookMinutes: number; kcal: number; steps: string[] };

const RECIPES: readonly Recipe[] = [
  {
    name: "Ginisang monggo",
    kind: "beans",
    ids: ["mung-beans", "onion", "garlic", "tomato", "malunggay", "oil", "salt"],
    cookMinutes: 40,
    kcal: 280,
    steps: [
      "Boil the mung beans in 2 cups of water for 25 minutes, until soft.",
      "Sauté the garlic, onion and tomato in oil for 3 minutes.",
      "Add the beans and their broth. Boil for 5 minutes.",
      "Add salt to taste.",
      "Add the moringa leaves. Turn off the heat after 1 minute.",
    ],
  },
  {
    name: "Adobong kangkong",
    kind: "vegetable",
    ids: ["kangkong", "garlic", "soy-sauce", "vinegar", "oil"],
    cookMinutes: 10,
    kcal: 120,
    steps: [
      "Wash the kangkong and cut it into short lengths.",
      "Sauté the garlic in oil until golden.",
      "Add the stems, the soy sauce and the vinegar. Cook for 2 minutes.",
      "Add the leaves and cook for 1 minute.",
    ],
  },
  {
    name: "Tortang talong",
    kind: "egg",
    ids: ["talong", "egg", "oil", "salt"],
    cookMinutes: 20,
    kcal: 230,
    steps: [
      "Grill or boil the eggplant until soft, then peel it.",
      "Flatten the eggplant with a fork.",
      "Beat the egg with salt, and dip the eggplant in it.",
      "Fry in oil for 3 minutes on each side.",
    ],
  },
  {
    name: "Ginisang kamatis at itlog",
    kind: "egg",
    ids: ["egg", "egg", "tomato", "onion", "oil", "salt"],
    cookMinutes: 10,
    kcal: 200,
    steps: [
      "Sauté the onion and tomato in oil until soft.",
      "Beat the eggs with salt.",
      "Pour in the eggs and stir gently until just set.",
    ],
  },
  {
    name: "Tuyo at kamatis",
    kind: "fish",
    ids: ["tuyo", "tomato", "onion", "vinegar", "oil"],
    cookMinutes: 10,
    kcal: 180,
    steps: [
      "Fry the tuyo in oil until crisp.",
      "Slice the tomato and the onion.",
      "Serve the tuyo with the tomato, the onion and the vinegar as a dip.",
    ],
  },
  {
    name: "Sardinas at miswa",
    kind: "soup",
    ids: ["sardines", "miswa", "onion", "garlic", "oil"],
    cookMinutes: 15,
    kcal: 230,
    steps: [
      "Sauté the garlic and onion in oil.",
      "Add the sardines and 1½ cups of water. Bring to a boil.",
      "Add the miswa and cook for 2 minutes.",
    ],
  },
  {
    name: "Pritong galunggong",
    kind: "fish",
    ids: ["galunggong", "oil", "salt", "vinegar"],
    cookMinutes: 15,
    kcal: 230,
    steps: [
      "Clean the fish, and rub it with salt.",
      "Heat the oil, and fry the fish for 5 minutes on each side.",
      "Serve with vinegar as a dip.",
    ],
  },
  {
    name: "Ginisang sayote",
    kind: "vegetable",
    ids: ["sayote", "ground-pork", "onion", "garlic", "oil", "fish-sauce"],
    cookMinutes: 20,
    kcal: 260,
    steps: [
      "Peel the chayote and slice it thin.",
      "Sauté the garlic and onion in oil.",
      "Add the pork and cook until brown.",
      "Add the chayote, the fish sauce and ¼ cup of water.",
      "Cover and cook for 8 minutes.",
    ],
  },
  {
    name: "Ginisang repolyo",
    kind: "vegetable",
    ids: ["repolyo", "carrot", "onion", "garlic", "oil", "soy-sauce"],
    cookMinutes: 15,
    kcal: 150,
    steps: [
      "Slice the cabbage and the carrot.",
      "Sauté the garlic and onion in oil.",
      "Add the carrot and cook for 2 minutes.",
      "Add the cabbage and the soy sauce. Cook for 4 minutes.",
    ],
  },
  {
    name: "Tortang giniling",
    kind: "egg",
    ids: ["ground-pork", "egg", "onion", "tomato", "oil", "salt"],
    cookMinutes: 20,
    kcal: 340,
    steps: [
      "Sauté the onion and tomato in oil.",
      "Add the pork and cook until brown. Let it cool a little.",
      "Beat the egg with salt, and mix in the pork.",
      "Fry for 3 minutes on each side.",
    ],
  },
  {
    name: "Tokwa't talong",
    kind: "vegetable",
    ids: ["tofu", "talong", "soy-sauce", "vinegar", "garlic", "oil"],
    cookMinutes: 20,
    kcal: 260,
    steps: [
      "Cut the tofu and the eggplant into cubes.",
      "Fry the tofu until golden, then fry the eggplant.",
      "Mix the soy sauce, vinegar and garlic.",
      "Pour the sauce over the tofu and eggplant.",
    ],
  },
  {
    name: "Ginataang kalabasa",
    kind: "vegetable",
    ids: ["kalabasa", "sitaw", "coconut-milk", "onion", "garlic", "oil", "salt"],
    cookMinutes: 25,
    kcal: 300,
    steps: [
      "Cut the squash into cubes, and the string beans into short lengths.",
      "Sauté the garlic and onion in oil.",
      "Add the coconut milk and bring it to a gentle boil.",
      "Add the squash and cook for 10 minutes.",
      "Add the string beans and salt. Cook for 5 minutes.",
    ],
  },
  {
    name: "Ginisang ampalaya",
    kind: "egg",
    ids: ["ampalaya", "egg", "tomato", "onion", "garlic", "oil", "salt"],
    cookMinutes: 15,
    kcal: 190,
    steps: [
      "Slice the bitter gourd thin, rub it with salt, then rinse it.",
      "Sauté the garlic, onion and tomato in oil.",
      "Add the bitter gourd and cook for 4 minutes.",
      "Beat the egg, pour it in, and stir until set.",
    ],
  },
  {
    name: "Pinakbet",
    kind: "vegetable",
    ids: ["kalabasa", "talong", "sitaw", "tomato", "onion", "bagoong", "oil"],
    cookMinutes: 25,
    kcal: 210,
    steps: [
      "Cut all the vegetables into pieces.",
      "Sauté the onion and tomato in oil.",
      "Add the shrimp paste and ½ cup of water.",
      "Add the squash and cook for 8 minutes.",
      "Add the eggplant and string beans. Cover and cook for 6 minutes.",
    ],
  },
  {
    name: "Tinolang manok",
    kind: "soup",
    ids: ["chicken-piece", "sayote", "ginger", "onion", "garlic", "malunggay", "fish-sauce", "oil"],
    cookMinutes: 35,
    kcal: 300,
    steps: [
      "Sauté the ginger, garlic and onion in oil.",
      "Add the chicken and the fish sauce. Cook for 3 minutes.",
      "Add 2 cups of water, and boil for 20 minutes.",
      "Add the chayote and cook for 6 minutes.",
      "Add the moringa leaves. Turn off the heat after 1 minute.",
    ],
  },
  {
    name: "Adobong atay",
    kind: "meat",
    ids: ["chicken-liver", "garlic", "onion", "soy-sauce", "vinegar", "oil"],
    cookMinutes: 20,
    kcal: 260,
    steps: [
      "Sauté the garlic and onion in oil.",
      "Add the liver and cook for 3 minutes.",
      "Add the soy sauce, the vinegar and ¼ cup of water.",
      "Simmer for 8 minutes, until the sauce is thick.",
    ],
  },
  {
    name: "Corned beef guisado",
    kind: "meat",
    ids: ["corned-beef", "patatas", "onion", "garlic", "oil"],
    cookMinutes: 15,
    kcal: 380,
    steps: [
      "Cut the potato into small cubes, and fry until golden.",
      "Sauté the garlic and onion in the same pan.",
      "Add the corned beef and cook for 3 minutes.",
      "Mix in the potato.",
    ],
  },
  {
    name: "Paksiw na tilapia",
    kind: "fish",
    ids: ["tilapia", "vinegar", "ginger", "garlic", "onion", "salt"],
    cookMinutes: 25,
    kcal: 220,
    steps: [
      "Put the ginger, garlic and onion in a pot.",
      "Lay the fish on top. Add the vinegar, ½ cup of water and salt.",
      "Bring to a boil with no lid and no stirring.",
      "Cover and simmer for 12 minutes.",
    ],
  },
  {
    name: "Ginisang pechay",
    kind: "vegetable",
    ids: ["pechay", "tofu", "garlic", "onion", "oil", "soy-sauce"],
    cookMinutes: 12,
    kcal: 190,
    steps: [
      "Cut the tofu into cubes, and fry until golden.",
      "Sauté the garlic and onion in the same pan.",
      "Add the pechay stems and the soy sauce. Cook for 2 minutes.",
      "Add the leaves and the tofu. Cook for 1 minute.",
    ],
  },
  {
    name: "Ginisang dilis",
    kind: "fish",
    ids: ["dilis", "tomato", "onion", "garlic", "oil", "chili"],
    cookMinutes: 10,
    kcal: 200,
    steps: [
      "Fry the dilis in oil until crisp, then set it aside.",
      "Sauté the garlic, onion, tomato and chili.",
      "Add the dilis and stir for 1 minute.",
    ],
  },
];

function toUlam(recipe: Recipe): Ulam {
  const priced = priceIngredients(recipe.ids);
  if (!priced) throw new Error(`${recipe.name}: unknown ingredient`);
  return {
    name: recipe.name,
    kind: recipe.kind,
    ingredients: priced.ingredients,
    cost: priced.cost,
    cookMinutes: recipe.cookMinutes,
    kcal: recipe.kcal,
    steps: recipe.steps,
  };
}

export const BACKUP_ULAM: readonly Ulam[] = RECIPES.map((recipe) => {
  const photo = checkedPhoto(recipe.name);
  return photo ? { ...toUlam(recipe), photo_url: photo } : toUlam(recipe);
});
