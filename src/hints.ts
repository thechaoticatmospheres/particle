import {
  combinationRecipes,
  itemFromKey,
  itemKey,
  type ItemKey,
} from "./crafting";
import { combine } from "./combiner";

/** Check actual combiner output so hints never promise a shadowed recipe. */
export function availableHints(unlocked: Set<ItemKey>, preferred?: ItemKey) {
  const seen = new Set<string>();
  const choices = combinationRecipes.flatMap(({ a, b }) => {
    if (!unlocked.has(a) || !unlocked.has(b)) return [];
    const pair = [String(a), String(b)].sort().join(":");
    if (seen.has(pair)) return [];
    seen.add(pair);
    const products = combine(itemFromKey(a), itemFromKey(b))
      .results.map(itemKey)
      .filter((key) => !unlocked.has(key));
    return products.length ? [{ a, b, products }] : [];
  });
  const matching = choices.filter(
    (r) => r.a === preferred || r.b === preferred,
  );
  return matching.length ? matching : choices;
}
