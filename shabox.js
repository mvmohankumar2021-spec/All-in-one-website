(() => {
  const cards = [...document.querySelectorAll('.shabox-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const search = document.querySelector('#shaboxSearch');
  const count = document.querySelector('#shaboxCount');
  const preview = document.querySelector('#shaboxPreview');
  const previewTitle = document.querySelector('#previewTitle');
  const previewKind = document.querySelector('#previewKind');
  let filter = 'all';

  const updateCatalogue = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matches = (filter === 'all' || card.dataset.genre === filter) && card.dataset.title.toLowerCase().includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    count.textContent = `${visible} title${visible === 1 ? '' : 's'} to explore`;
  };
  filters.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle('selected', item === button));
    updateCatalogue();
  }));
  search.addEventListener('input', updateCatalogue);
  document.querySelectorAll('[data-title]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    previewTitle.textContent = button.dataset.title;
    previewKind.textContent = button.dataset.kind || 'ShaBox selection';
    preview.showModal();
  }));
  document.querySelector('.shabox-preview-close').addEventListener('click', () => preview.close());
  document.querySelector('#previewPlay').addEventListener('click', () => alert('Connect a licensed trailer or video provider here before publishing.'));
  updateCatalogue();
})();
