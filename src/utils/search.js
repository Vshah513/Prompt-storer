// PromptVault — Full-text Search Engine

import { getPrompts } from '../store.js';

export function searchPrompts(query, prompts = null) {
  if (!query || !query.trim()) return prompts || getPrompts();

  const terms = query.toLowerCase().trim().split(/\s+/);
  const items = prompts || getPrompts();

  const scored = items.map(prompt => {
    let score = 0;
    const searchFields = [
      { text: prompt.title || '', weight: 10 },
      { text: prompt.description || '', weight: 5 },
      { text: prompt.category || '', weight: 3 },
      { text: (prompt.tags || []).join(' '), weight: 4 },
      { text: prompt.promptContent || '', weight: 2 },
      { text: prompt.outputText || '', weight: 1 },
    ];

    for (const term of terms) {
      let termScore = 0;
      for (const field of searchFields) {
        const lower = field.text.toLowerCase();
        if (lower.includes(term)) {
          // Exact word boundary match gets higher score
          const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
          if (regex.test(field.text)) {
            termScore += field.weight * 2;
          } else {
            termScore += field.weight;
          }
        }
      }
      score += termScore;
    }

    return { prompt, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.prompt);
}

export function filterByCategory(prompts, categoryId) {
  if (!categoryId || categoryId === 'all') return prompts;
  if (categoryId === 'favorites') return prompts.filter(p => p.favorite);
  return prompts.filter(p => p.category === categoryId);
}

export function highlightMatches(text, query) {
  if (!query || !text) return text;
  const terms = query.trim().split(/\s+/);
  let result = text;
  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    result = result.replace(regex, '<mark>$1</mark>');
  }
  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
