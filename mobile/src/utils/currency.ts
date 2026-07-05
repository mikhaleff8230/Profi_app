type BudgetTask = {
  budget?: number | null;
  budget_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  budget_label?: string | null;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function formatTaskBudget(taskOrBudget?: BudgetTask | number | null): string | null {
  if (taskOrBudget == null) return null;
  if (typeof taskOrBudget === "number") {
    if (taskOrBudget <= 0) return null;
    return `${fmt(taskOrBudget)} ₽`;
  }
  const task = taskOrBudget;
  if (task.budget_label) return task.budget_label;
  if (task.budget_type === "range") {
    const min = task.budget_min;
    const max = task.budget_max;
    if (min != null && max != null) return `от ${fmt(min)} до ${fmt(max)} ₽`;
    if (min != null) return `от ${fmt(min)} ₽`;
    return null;
  }
  if (task.budget != null && task.budget > 0) return `${fmt(task.budget)} ₽`;
  return null;
}

export function formatResponseFeeMdl(fee?: number | null): string {
  if (fee == null || fee <= 0) return "бесплатно";
  return `${fee} ₽`;
}
