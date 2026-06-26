/** Демо-данные, если API недоступен или вернул пусто (как заглушка на фронте). */
export const MOCK_STORIES = [
  { id: "spring", title_ru: "Что всплывает весной?", color: "#9DB2C4" },
  { id: "moments", title_ru: "Ради таких моментов", color: "#A4B9D1" },
  { id: "now", title_ru: "Здесь и сейчас", color: "#B8C7DC" },
];

export const MOCK_TASKS_LIST = [
  {
    id: "demo-task-1",
    title: "Установить смеситель на кухне",
    description: "Нужен мастер с инструментом, демо-заказ без бэкенда.",
    budget: 3500,
    city: "Москва",
    created_at: new Date().toISOString(),
    category: 1,
    status: "open",
    lat: 55.75,
    lng: 37.62,
  },
  {
    id: "demo-task-2",
    title: "Перевезти диван в пределах МКАД",
    description: "2 этажа, лифт есть.",
    budget: 5000,
    city: "Москва",
    created_at: new Date().toISOString(),
    category: 2,
    status: "open",
    lat: 55.74,
    lng: 37.61,
  },
];

export function mockTaskDetail(id: string) {
  const base = MOCK_TASKS_LIST.find((t) => t.id === id) || MOCK_TASKS_LIST[0];
  return {
    ...base,
    id,
    description: base.description + "\n\n(Данные демонстрационные — подключите API.)",
    address: "ул. Примерная, 1",
    photos: [] as string[],
    status: "open" as const,
    customer_id: "demo-customer",
    customer_name: "Демо Клиент",
    applications_count: 0,
    distance_km: null as number | null,
    deadline: null as string | null,
  };
}

export const MOCK_SPECIALIST = {
  id: "demo-spec",
  name: "Демо Специалист",
  rating: 4.8,
  reviews_count: 12,
  city: "Москва",
  bio: "Опытный мастер. Это демо-профиль при недоступном API.",
  services: ["Сантехника", "Мелкий ремонт"],
};
