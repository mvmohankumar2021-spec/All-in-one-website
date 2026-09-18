(() => {
  const bar = document.querySelector('.home-product-search');
  if (!bar) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'calculator-dialog';
  dialog.innerHTML = `
    <button type="button" class="calculator-close" aria-label="Close calculator">×</button><button type="button" class="calculator-help" aria-label="Show calculator help">?</button>
    <p class="eyebrow">SHAKALPA TOOLS</p>
    <h2>Quick calculator</h2>
    <p class="calculator-copy">Quick calculations, right where you need them.</p>
    <div class="calculator-help-panel" hidden>Enter an expression such as <b>10 + 5 × 2</b>, or use functions such as <b>average(10, 20, 30)</b>. The <b>Avg</b> key starts an average function; <b>ans</b> uses the latest answer.</div>
    <div class="calculator-fields">
      <label>Numbers or calculation<span class="calculator-input-wrap"><textarea id="calculatorNumbers" inputmode="decimal" rows="3" spellcheck="false"></textarea><output class="calculator-result" aria-live="polite">—</output></span></label>
    </div>
    <div class="calculator-actions calculator-keypad" aria-label="Calculator keypad">
      <button type="button" data-key="(" class="calculator-utility">(</button><button type="button" data-key=")" class="calculator-utility">)</button><button type="button" data-key="%" class="calculator-utility">%</button><button type="button" data-action="clear" class="calculator-utility">AC</button>
      <button type="button" data-key="7">7</button><button type="button" data-key="8">8</button><button type="button" data-key="9">9</button><button type="button" data-key="÷" class="calculator-operator">÷</button>
      <button type="button" data-key="4">4</button><button type="button" data-key="5">5</button><button type="button" data-key="6">6</button><button type="button" data-key="×" class="calculator-operator">×</button>
      <button type="button" data-key="1">1</button><button type="button" data-key="2">2</button><button type="button" data-key="3">3</button><button type="button" data-key="−" class="calculator-operator">−</button>
      <button type="button" data-key="0">0</button><button type="button" data-key=".">.</button><button type="button" data-key="average(" class="calculator-utility">Avg</button><button type="button" data-key="+" class="calculator-operator">+</button>
      <button type="button" data-action="backspace" class="calculator-utility calculator-backspace" aria-label="Backspace">⌫</button><button type="button" data-action="equals" class="calculator-equals" aria-label="Calculate">=</button>
    </div>
    <section class="calculator-history" aria-label="Calculation history"><div><strong>History</strong><button type="button" class="calculator-clear-history">Clear history</button></div><ol></ol></section>`;
  document.body.append(dialog);

  const numbersInput = dialog.querySelector('#calculatorNumbers');
  const result = dialog.querySelector('.calculator-result');
  const historyList = dialog.querySelector('.calculator-history ol');
  let lastAnswer = null;
  const helpPanel = dialog.querySelector('.calculator-help-panel');
  dialog.querySelector('.calculator-help').addEventListener('click', () => {
    helpPanel.hidden = !helpPanel.hidden;
  });
  const format = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 10 }).format(value);
  const evaluateExpression = source => {
    const normalized = source.trim().replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
    if (!normalized) throw new Error('Enter a calculation first.');
    const tokens = [];
    const tokenPattern = /\s*(addition|add|subtraction|subtract|multiplication|multiply|division|divide|average|avg|percentage|percent|pct|ans|\d*\.?\d+|[()+\-*/%,])\s*/gy;
    let cursor = 0;
    while (cursor < normalized.length) {
      tokenPattern.lastIndex = cursor;
      const match = tokenPattern.exec(normalized);
      if (!match) throw new Error('Use only numbers, +, −, ×, ÷, %, brackets, avg(), or percent().');
      tokens.push(match[1]);
      cursor = tokenPattern.lastIndex;
    }
    let position = 0;
    const peek = () => tokens[position];
    const take = expected => {
      if (expected && peek() !== expected) throw new Error(`Expected “${expected}”.`);
      return tokens[position++];
    };
    const expression = () => {
      let value = term();
      while (peek() === '+' || peek() === '-') {
        const operator = take();
        const right = term();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    };
    const term = () => {
      let value = primary();
      while (peek() === '*' || peek() === '/' || peek() === '%') {
        const operator = take();
        const right = primary();
        if ((operator === '/' || operator === '%') && right === 0) throw new Error('Cannot divide by zero.');
        value = operator === '*' ? value * right : operator === '/' ? value / right : value % right;
      }
      return value;
    };
    const primary = () => {
      const token = peek();
      if (token === '+' || token === '-') return take() === '-' ? -primary() : primary();
      if (token === '(') {
        take('(');
        const value = expression();
        take(')');
        return value;
      }
      if (token === 'ans') {
        take('ans');
        if (lastAnswer === null) throw new Error('There is no previous answer yet.');
        return lastAnswer;
      }
      if (['add', 'addition', 'subtract', 'subtraction', 'multiply', 'multiplication', 'divide', 'division', 'avg', 'average', 'percent', 'percentage', 'pct'].includes(token)) {
        const functionName = take();
        take('(');
        const values = [expression()];
        while (peek() === ',') { take(','); values.push(expression()); }
        take(')');
        if (functionName === 'add' || functionName === 'addition') return values.reduce((sum, value) => sum + value, 0);
        if (functionName === 'subtract' || functionName === 'subtraction') return values.slice(1).reduce((value, next) => value - next, values[0]);
        if (functionName === 'multiply' || functionName === 'multiplication') return values.reduce((product, value) => product * value, 1);
        if (functionName === 'divide' || functionName === 'division') {
          if (values.slice(1).some(value => value === 0)) throw new Error('Cannot divide by zero.');
          return values.slice(1).reduce((value, next) => value / next, values[0]);
        }
        if (functionName === 'avg' || functionName === 'average') return values.reduce((sum, value) => sum + value, 0) / values.length;
        if (values.length !== 2 || values[1] === 0) throw new Error('percent(value, total) needs two values and a non-zero total.');
        return values[0] / values[1] * 100;
      }
      if (!token || !/^\d*\.?\d+$/.test(token)) throw new Error('Enter a valid calculation.');
      const value = Number(take());
      if (!Number.isFinite(value)) throw new Error('Enter a valid calculation.');
      return value;
    };
    const value = expression();
    if (position !== tokens.length) throw new Error('Check the calculation syntax.');
    return value;
  };
  const showError = message => {
    result.textContent = message;
    result.classList.add('is-error');
  };
  const saveAnswer = (value, historyEntry) => {
    lastAnswer = value;
    result.textContent = `= ${format(value)}`;
    result.classList.remove('is-error');
    const item = document.createElement('li');
    const useAnswer = document.createElement('button');
    useAnswer.type = 'button';
    useAnswer.title = 'Use this answer for the next calculation';
    useAnswer.textContent = `${historyEntry} = ${format(value)}`;
    useAnswer.addEventListener('click', () => {
      numbersInput.value = String(value);
      numbersInput.focus();
      numbersInput.select();
    });
    item.append(useAnswer);
    historyList.prepend(item);
  };
  const calculate = operation => {
    if (operation === 'expression') {
      try {
        const source = numbersInput.value.trim();
        const listValues = source.split(/[\s,]+/).filter(Boolean).map(Number);
        const isNumberList = listValues.length > 1 && listValues.every(value => Number.isFinite(value));
        const value = isNumberList ? listValues.reduce((sum, item) => sum + item, 0) : evaluateExpression(source);
        saveAnswer(value, isNumberList ? `Sum of ${listValues.map(format).join(', ')}` : source);
      } catch (error) { showError(error.message); }
      return;
    }
    const rawValues = numbersInput.value.trim().split(/[\s,]+/).filter(Boolean);
    const values = rawValues.map(Number);
    if (!values.length || values.some(value => !Number.isFinite(value))) {
      showError('Enter valid numbers separated by commas, spaces, or new lines.');
      return;
    }
    const [first, ...rest] = values;
    const total = values.reduce((sum, value) => sum + value, 0);
    const compact = values.length <= 6 ? values.map(format).join(', ') : `${values.slice(0, 6).map(format).join(', ')} … (${values.length} values)`;
    const calculations = {
      add: ['Addition', `Sum of ${compact}`, total],
      subtract: ['Subtraction', `${format(first)} minus the remaining values`, first - rest.reduce((sum, value) => sum + value, 0)],
      multiply: ['Multiplication', `Product of ${compact}`, values.reduce((product, value) => product * value, 1)],
      divide: ['Division', `${format(first)} divided by each remaining value`, rest.some(value => value === 0) ? null : rest.reduce((quotient, value) => quotient / value, first)],
      percent: ['Percentage', rest.length ? `${format(first)} as a share of the remaining total` : 'Add at least two values', rest.length && rest.reduce((sum, value) => sum + value, 0) !== 0 ? first / rest.reduce((sum, value) => sum + value, 0) * 100 : null],
      average: ['Average', `Average of ${values.length} values`, total / values.length],
    };
    const [label, expression, value] = calculations[operation];
    if (value === null) showError(operation === 'percent' ? 'Use at least two values and a non-zero total.' : 'Cannot divide by zero.');
    else saveAnswer(value, `${label}: ${expression}`);
  };
  numbersInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      calculate('expression');
    }
  });
  const insertKey = key => {
    const start = numbersInput.selectionStart ?? numbersInput.value.length;
    const end = numbersInput.selectionEnd ?? start;
    numbersInput.setRangeText(key, start, end, 'end');
    numbersInput.focus();
  };
  dialog.querySelectorAll('.calculator-keypad button').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.key) return insertKey(button.dataset.key);
    if (button.dataset.action === 'equals') return calculate('expression');
    if (button.dataset.action === 'clear') {
      numbersInput.value = '';
      result.textContent = lastAnswer === null ? '—' : `= ${format(lastAnswer)}`;
      result.classList.remove('is-error');
      return numbersInput.focus();
    }
    if (button.dataset.action === 'backspace') {
      const start = numbersInput.selectionStart ?? numbersInput.value.length;
      const end = numbersInput.selectionEnd ?? start;
      numbersInput.setRangeText('', start === end ? Math.max(0, start - 1) : start, end, 'end');
      numbersInput.focus();
    }
  }));
  dialog.querySelector('.calculator-clear-history').addEventListener('click', () => {
    historyList.replaceChildren();
    lastAnswer = null;
    result.textContent = '—';
    result.classList.remove('is-error');
  });
  dialog.querySelector('.calculator-close').addEventListener('click', () => dialog.close());

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'calculator-symbol';
  button.setAttribute('aria-label', 'Open basic calculator');
  button.title = 'Basic calculator';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.75" width="14" height="18.5" rx="2.5"/><path d="M8.25 6.5h7.5M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01"/></svg>';
  button.addEventListener('click', () => { dialog.showModal(); numbersInput.select(); });
  const converterButton = bar.querySelector('.converter-symbol');
  if (converterButton) converterButton.insertAdjacentElement('afterend', button);
  else bar.prepend(button);
})();
