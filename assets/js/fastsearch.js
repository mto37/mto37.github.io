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

const excerpt = (item) => {
  const source = (item.content || item.summary || '').replace(/\s+/g, ' ').trim();
  return source.length > 180 ? source.slice(0, 180) + '…' : source;
};

const renderResults = (results) => {
  resList.innerHTML = '';
  if (!results.length) return;

  const fragment = document.createDocumentFragment();
  for (const result of results) {
    const item = result.item;
    const li = document.createElement('li');
    li.className = 'search-result';

    const title = document.createElement('span');
    title.className = 'search-result-title';
    title.textContent = item.title;

    const preview = document.createElement('p');
    preview.className = 'search-result-preview';
    preview.textContent = excerpt(item);

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
  if (!query) return renderResults([]);

  const limit = params.fuseOpts?.limit;
  renderResults(fuse.search(query, limit ? { limit } : undefined));
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
