export function formatPrice(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function specLine(l: {
  rooms: string;
  area: string;
  floor: string;
  land: string;
}): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (l.rooms) out.push({ value: l.rooms, label: "комн." });
  if (l.area) out.push({ value: l.area, label: "м²" });
  if (l.floor) out.push({ value: l.floor, label: "этаж" });
  if (l.land) out.push({ value: l.land, label: "участок" });
  return out;
}
