export type DefaultCategory = {
  key: string;
  nameEn: string;
  nameKh: string;
  budget: number;
  fixedDay: number | null;
  sortOrder: number;
};

// Seeded for every new user, based on the user's real monthly figures.
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { key: "housing", nameEn: "Housing (Rent + Utilities)", nameKh: "លំនៅដ្ឋាន (ជួល+អគ្គិសនី/ទឹក)", budget: 60, fixedDay: 10, sortOrder: 1 },
  { key: "personal_care", nameEn: "Personal Care", nameKh: "របស់ប្រើប្រចាំថ្ងៃ", budget: 25.5, fixedDay: null, sortOrder: 2 },
  { key: "food", nameEn: "Food & Dining", nameKh: "អាហារ", budget: 165, fixedDay: null, sortOrder: 3 },
  { key: "entertainment", nameEn: "Entertainment", nameKh: "កម្សាន្ត", budget: 20, fixedDay: null, sortOrder: 4 },
  { key: "transport", nameEn: "Transport", nameKh: "ដឹកជញ្ជូន", budget: 0, fixedDay: null, sortOrder: 5 },
  { key: "misc", nameEn: "Miscellaneous", nameKh: "ផ្សេងៗ", budget: 0, fixedDay: null, sortOrder: 6 },
];

export const MEAL_COST_DEFAULT = { breakfast: 1.5, lunch: 2.0, dinner: 2.0 };

export const CATEGORY_ICON: Record<string, string> = {
  housing: "🏠",
  personal_care: "🧴",
  food: "🍜",
  entertainment: "🎮",
  transport: "🛵",
  misc: "🗂️",
};
