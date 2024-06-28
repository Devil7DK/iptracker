import { useEffect, useState } from "react";

export function useDependantState<T>(
  valueOrFunction: T | ((oldValue?: T) => T),
  dependencies: any[]
) {
  const state = useState<T>(valueOrFunction);

  useEffect(() => {
    state[1](valueOrFunction);
  }, dependencies);

  return state;
}
