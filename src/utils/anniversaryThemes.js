// Standard UK traditional wedding anniversary gift themes.
const UK_TRADITIONAL_THEMES = {
  1: "Paper", 2: "Cotton", 3: "Leather", 4: "Fruit/Flowers", 5: "Wood",
  6: "Sugar/Iron", 7: "Wool/Copper", 8: "Bronze/Pottery", 9: "Pottery/Willow",
  10: "Tin/Aluminium", 11: "Steel", 12: "Silk/Linen", 13: "Lace", 14: "Ivory",
  15: "Crystal", 20: "China", 25: "Silver", 30: "Pearl", 35: "Coral",
  40: "Ruby", 45: "Sapphire", 50: "Gold", 55: "Emerald", 60: "Diamond",
  65: "Blue Sapphire", 70: "Platinum",
};

export function anniversaryTheme(years) {
  return UK_TRADITIONAL_THEMES[years] || null;
}

export function yearsMarried(anniversaryDate) {
  if (!anniversaryDate) return null;
  const [y, m, d] = anniversaryDate.split("-").map(Number);
  const today = new Date();
  let years = today.getFullYear() - y;
  const hadAnniversaryThisYear =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadAnniversaryThisYear) years -= 1;
  return years;
}
