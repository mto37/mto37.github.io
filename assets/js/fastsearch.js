import * as params from '@params';

const resList = document.getElementById('searchResults');
const sInput = document.getElementById('searchInput');
let fuse;

const defaults = {
  distance: 100,
  threshold: 0.4,
  ignoreLocation: true,
  keys: ['title', 'permalink', 'summary', 'content']
};

const options = () => ({
  ...defaults,
  ...(params.fuseOpts || {}),
  keys: params.fuseOpts?.keys || defaults.keys
});

const cleanText = (item) => (item.content || item.summary || '')
  .replace(/\s+/g, ' ')
  .trim();

const searchTerms = (query) => query
  .trim()
  .split(/\s+/)
  .filter(Boolean);

const excerpt = (item, query) => {
  const source = cleanText(item);
  const lowered = source.toLocaleLowerCase();
  const terms = searchTerms(query);
  const match = terms
    .map((term) => lowered.indexOf(term.toLocaleLowerCase()))
    .find((index) => index >= 0);

  if (match === undefined) {
    return source.length > 180 ? source.slice(0, 180) + '…' : source;
  }

  const start = Math.max(0, match - 70);
  const end = Math.min(source.length, start + 180);
  return (start > 0 ? '…' : '') + source.slice(start, end) + (end < source.length ? '…' : '');
};

const appendHighlightedText = (element, text, query) => {
  const terms = searchTerms(query).sort((a, b) => b.length - a.length);
  if (!terms.length) {
    element.textContent = text;
    return;
  }

  const escapedTerms = terms.map((term) => term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const matcher = new RegExp('(' + escapedTerms.join('|') + ')', 'gi');

  for (const part of text.split(matcher)) {
    if (!part) continue;
    if (terms.some((term) => part.toLocaleLowerCase() === term.toLocaleLowerCase())) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      element.appendChild(mark);
    } else {
      element.appendChild(document.createTextNode(part));
    }
  }
};

const renderResults = (results, query) => {
  resList.innerHTML = '';
  if (!results.length) return;

  const fragment = document.createDocumentFragment();
  for (const result of results) {
    const item = result.item;
    const li = document.createElement('li');
    li.className = 'search-result';

    const title = document.createElement('span');
    title.className = 'search-result-title';
    appendHighlightedText(title, item.title, query);

    const preview = document.createElement('p');
    preview.className = 'search-result-preview';
    appendHighlightedText(preview, excerpt(item, query), query);

    const link = document.createElement('a');
    link.className = 'entry-link';
    link.href = item.permalink;
    link.setAttribute('aria-label', item.title);

    li.append(title, preview, link);
    fragment.appendChild(li);
  }
  resList.appendChild(fragment);
};

const search = () => {
  if (!fuse) return;
  const query = sInput.value.trim();
  if (!query) return renderResults([], '');

  const limit = params.fuseOpts?.limit;
  renderResults(fuse.search(query, limit ? { limit } : undefined), query);
};

window.addEventListener('load', async () => {
  if (!sInput || !resList) return;
  sInput.disabled = false;
  sInput.focus();

  try {
    const response = await fetch('../index.json');
    if (!response.ok) throw new Error('Search index load failed');
    fuse = new Fuse(await response.json(), options());
  } catch (error) {
    console.error(error);
  }
});

sInput?.addEventListener('input', () => {
  window.clearTimeout(window.searchDebounce);
  window.searchDebounce = window.setTimeout(search, 150);
});
