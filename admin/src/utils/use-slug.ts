export function formatSlug(inputString: string): string {
  if (!inputString) return '';

  // Normalize and remove diacritics for Latin-based scripts
  let working = inputString.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Basic Cyrillic → Latin transliteration map (Russian/UA common subset)
  const map: Record<string, string> = {
    А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g',
    Д: 'D', д: 'd', Е: 'E', е: 'e', Ё: 'E', ё: 'e', Ж: 'Zh', ж: 'zh',
    З: 'Z', з: 'z', И: 'I', и: 'i', Й: 'Y', й: 'y', К: 'K', к: 'k',
    Л: 'L', л: 'l', М: 'M', м: 'm', Н: 'N', н: 'n', О: 'O', о: 'o',
    П: 'P', п: 'p', Р: 'R', р: 'r', С: 'S', с: 's', Т: 'T', т: 't',
    У: 'U', у: 'u', Ф: 'F', ф: 'f', Х: 'H', х: 'h', Ц: 'C', ц: 'c',
    Ч: 'Ch', ч: 'ch', Ш: 'Sh', ш: 'sh', Щ: 'Shch', щ: 'shch', Ъ: '', ъ: '',
    Ы: 'Y', ы: 'y', Ь: '', ь: '', Э: 'E', э: 'e', Ю: 'Yu', ю: 'yu', Я: 'Ya', я: 'ya',
    Є: 'Ye', є: 'ye', І: 'I', і: 'i', Ї: 'Yi', ї: 'yi', Ґ: 'G', ґ: 'g',
  };

  working = Array.from(working)
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join('');

  // Replace any non-alphanumeric with hyphen, lowercase, and collapse hyphens
  working = working
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  return working;
}
