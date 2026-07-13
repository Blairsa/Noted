// Small shared helpers so age/DOB formatting is identical everywhere it's
// shown (Home's "this month" strip and the person page subline).

export function calcAge(birthdate) {
  if (!birthdate) return null;
  const [y, m, d] = birthdate.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// UK format: dd/mm/yy
export function formatDob(birthdate) {
  if (!birthdate) return "";
  const [y, m, d] = birthdate.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
}

// "27 · 18/02/97" - age before date, per Sam & Kerry's preference
export function formatAgeAndDob(birthdate) {
  if (!birthdate) return "";
  const age = calcAge(birthdate);
  const dob = formatDob(birthdate);
  return age === null ? dob : `${age} · ${dob}`;
}
