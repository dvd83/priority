/** Normalise un libellé pour comparaison : minuscules, sans accents ni espaces superflus. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Construit un prédicat « appartient à la liste » insensible à la casse et aux accents. */
export function matcher(values: readonly string[]): (candidate: string | null | undefined) => boolean {
  const set = new Set(values.map(normalizeText).filter(Boolean));
  return (candidate) => {
    const n = normalizeText(candidate);
    return n !== "" && set.has(n);
  };
}
