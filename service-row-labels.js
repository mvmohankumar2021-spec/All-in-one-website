(() => {
  document.querySelectorAll('.plumbing-row').forEach(row => {
    const fields = row.querySelectorAll('input');
    if (fields[0] && !fields[0].getAttribute('placeholder')) fields[0].setAttribute('placeholder', 'Years');
    if (fields[1] && !fields[1].getAttribute('placeholder')) fields[1].setAttribute('placeholder', 'Starting ₹');
  });
})();
