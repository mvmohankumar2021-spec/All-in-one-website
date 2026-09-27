/* Local, exact-match UI translations. No user data is sent to a translation service. */
(() => {
  const dictionary = window.SHAKALPA_TRANSLATIONS || {};
  // role-labels.js changes display copy before localization runs. Build exact
  // aliases using that same mapping, without changing role IDs or user values.
  const displayRoles = {Customer:'SHAKALPA Member',Vendor:'SHAKALPA Partner',Agent:'SHAKALPA Associate'};
  Object.keys(dictionary).forEach(key => {
    const alias = key.replace(/\b(Customer|Vendor|Agent)(s)?\b/g, (_, role, plural) => displayRoles[role] + (plural || ''));
    if (alias !== key && !dictionary[alias]) dictionary[alias] = dictionary[key];
  });
  const supported = ['en','ta','hi'];
  let language = 'en';
  try { const saved = localStorage.getItem('shakalpa-language'); if (supported.includes(saved)) language = saved; } catch {}
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const policyPage = /(?:-policy\.html$|^\/legal\/)/.test(location.pathname);
  if (policyPage) document.body.dataset.policyTranslation = 'draft';
  function translate(text, lang = language) {
    if (lang === 'en') return text;
    const source = text.trim().replace(/\s+/g,' ');
    let translated = dictionary[source]?.[lang];
    if (!translated && /\n\s*\n/.test(text.trim())) {
      const paragraphs = text.trim().split(/\n\s*\n/).map(part=>part.trim().replace(/\s+/g,' '));
      if (paragraphs.every(part=>dictionary[part]?.[lang])) translated = paragraphs.map(part=>dictionary[part][lang]).join('\n\n');
    }
    if (!translated && source.includes(' → ')) {
      const steps = source.split(' → ');
      if (steps.every(step=>dictionary[step]?.[lang])) translated = steps.map(step=>dictionary[step][lang]).join(' → ');
    }
    if (!translated && source.endsWith(' →')) {
      const label = dictionary[source.slice(0, -2)]?.[lang];
      if (label) translated = label + ' →';
    }
    if (!translated && source.startsWith('For example: ')) {
      const example = source.slice(13);
      const value = dictionary[example]?.[lang] || (/^(?:From )?[₹\d]/.test(example) ? example.replace(/^From /, lang === 'ta' ? 'தொடக்கம் ' : 'से शुरू ') : null);
      if (value) translated = (lang === 'ta' ? 'உதாரணம்: ' : 'उदाहरण: ') + value;
    }
    if (!translated && source.startsWith('I accept ')) {
      const policy = source.slice(9).replace(/\s*\*$/, '');
      if (dictionary[policy]?.[lang]) translated = (lang === 'ta' ? `${dictionary[policy][lang]} — ஏற்கிறேன்` : `मैं ${dictionary[policy][lang]} स्वीकार करता/करती हूँ`) + (source.endsWith('*') ? ' *' : '');
    }
    if (!translated) {
      const match = source.match(/^(.*?)(\s*\*|\s*\(optional\))$/);
      if (match && dictionary[match[1]]?.[lang]) translated = dictionary[match[1]][lang] + (match[2].includes('*') ? ' *' : lang === 'ta' ? ' (விருப்பத்தேர்வு)' : ' (वैकल्पिक)');
    }
    if (!translated && source.startsWith('Help for ')) {
      const key = source.slice(9).replace(/\s*\*$/, '');
      const matchedKey = dictionary[key] ? key : Object.keys(dictionary).find(item=>item.toLowerCase() === key.toLowerCase());
      const label = dictionary[matchedKey]?.[lang];
      if (label) translated = lang === 'ta' ? `${label} — உதவி` : `${label} — सहायता`;
    }
    if (!translated && source.startsWith('Provide ') && source.endsWith('.')) {
      const label = dictionary[source.slice(8,-1)]?.[lang];
      if (label) translated = lang === 'ta' ? `${label} வழங்கவும்.` : `${label} दें।`;
    }
    if (!translated && source.startsWith('Enter accurate ')) {
      const hint = source.match(/^Enter accurate (.+?)(?: for this (bakery|restaurant) service\.|\. This information is used to review and activate your service profile\.)$/);
      if (hint) {
        const labelKey = Object.keys(dictionary).find(key=>key.toLowerCase() === hint[1].replace(/\s*\*$/, '').toLowerCase());
        const label = dictionary[labelKey]?.[lang];
        if (label) {
          translated = lang === 'ta' ? `${label} — துல்லியமான விவரங்களை உள்ளிடவும்.` : `${label} — सही विवरण दर्ज करें।`;
          if (!hint[2]) translated += lang === 'ta' ? ' உங்கள் சேவைச் சுயவிவரத்தை ஆய்வு செய்து செயல்படுத்த இந்தத் தகவல் பயன்படுத்தப்படும்.' : ' यह जानकारी आपकी सेवा प्रोफ़ाइल की समीक्षा और सक्रियण के लिए उपयोग होती है।';
        }
      }
    }
    if (!translated && source.includes(': ')) {
      const split = source.indexOf(': ');
      const label = dictionary[source.slice(0,split)]?.[lang];
      const hint = dictionary[source.slice(split+2)]?.[lang];
      if (label && hint) translated = `${label}: ${hint}`;
    }
    if (!translated && source.endsWith(' is required.')) {
      const label = source.slice(0,-13);
      translated = lang === 'ta' ? `${dictionary[label]?.[lang] || label} தேவை.` : `${dictionary[label]?.[lang] || label} आवश्यक है।`;
    }
    return translated ? text.replace(text.trim(), translated) : text;
  }
  const selector = 'title,header a,header button,nav a,nav button,footer,.button,.eyebrow,.announcement,.hero-copy,.category-strip,.section-heading,.service-intro,.about-content,.contact-hero,.contact-options,.contact-note,.contact-form-section>div,.signup-copy,.signup-intro,.signup-form-wrap,.auth-copy,.home-button,.legal-links,.auth-divider,.google-login,main h1,main h2,main h3,form label,form legend,form button,form option,form small,form p,form h2,form h3,[role="status"],[role="alert"],.validation-summary,[class$="-help-tooltip"],.global-help-detail,.field-help-detail,.universal-help-popover,.plumbing-help-popover,[class$="-section-help-detail"],[id$="Status"],[data-i18n],body[data-policy-translation] h1,body[data-policy-translation] h2,body[data-policy-translation] p,body[data-policy-translation] td,body[data-policy-translation] .download';
  const excluded = 'script,style,textarea,input,[contenteditable],#language-control,[translate="no"],.document-list,#certificateList,#chatMessages,#homeShagramPosts,#productGrid,#postsFeed,#savedPosts,.user-content';
  const productControls = '.product-card-actions,.review-toggle,.review-composer';
  function skipTranslation(element, attribute = false) {
    const base = excluded.replace('#productGrid,','');
    if (element.closest(attribute ? base.replace('textarea,input,','') : base)) return true;
    // Only fixed controls inside product cards; never names, prices or reviews.
    return !!element.closest('#productGrid') && !element.closest(productControls);
  }
  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    // Pin every option before a parent label's text walker can translate it.
    document.querySelectorAll('option').forEach(element => {
      if (!skipTranslation(element) && !element.hasAttribute('value')) element.setAttribute('value',element.value);
    });
    document.querySelectorAll(selector + ',' + productControls + ',.header-home-symbol,.policy-centre-link,.hero-art,.booking-card,.role-card,.security-points,.tracking-copy,.tracking-map,.join-banner,.cart-header,.cart-footer,.empty-cart,body[data-policy-translation] .brand').forEach(element => {
      if (skipTranslation(element)) return;
      // Options without explicit values otherwise submit their translated labels.
      if (element.tagName === 'OPTION' && !element.hasAttribute('value')) element.setAttribute('value',element.value);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (skipTranslation(node.parentElement)) continue;
        const prior = originals.get(node);
        const source = prior && node.nodeValue === prior.rendered ? prior.source : node.nodeValue;
        const rendered = translate(source);
        if (node.nodeValue !== rendered) node.nodeValue = rendered;
        originals.set(node,{source,rendered});
      }
    });
    document.querySelectorAll('button[aria-label],button[title],a[aria-label],a[title],nav[aria-label],img[alt],input[placeholder],textarea[placeholder]').forEach(element => {
      if (skipTranslation(element,true)) return;
      const prior = attributes.get(element) || {};
      for (const key of ['aria-label','placeholder','title','alt']) {
        if (!element.hasAttribute(key)) continue;
        const current = element.getAttribute(key);
        const source = prior[key] && current === prior[key].rendered ? prior[key].source : current;
        const rendered = translate(source);
        if (current !== rendered) element.setAttribute(key,rendered);
        prior[key] = {source,rendered};
      }
      attributes.set(element,prior);
    });
    select.value = language;
    notice.hidden = language === 'en';
    notice.textContent = language === 'ta' ? 'மொழிபெயர்க்கப்படாத உள்ளடக்கமும் கொள்கைகளும் ஆங்கிலத்தில் காட்டப்படும்.' : 'अनुवाद उपलब्ध न होने पर सामग्री और नीतियाँ अंग्रेज़ी में दिखाई जाएँगी।';
    if (policyPage && language !== 'en') notice.textContent = language === 'ta' ? 'வரைவு மொழிபெயர்ப்பு — சட்ட அல்லது மொழி ஆய்வு செய்யப்படவில்லை. மூல உரையைப் படிக்க English-ஐத் தேர்ந்தெடுக்கவும். மொழிபெயர்க்கப்படாத பகுதிகள் ஆங்கிலத்தில் உள்ளன.' : 'मसौदा अनुवाद — कानूनी या भाषायी समीक्षा नहीं हुई है। मूल पाठ पढ़ने के लिए English चुनें। अनुवाद न हुए भाग अंग्रेज़ी में हैं।';
    observer.observe(document.body,{childList:true,characterData:true,subtree:true});
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(); });
  });
  const control = document.createElement('div'); control.id = 'language-control'; control.translate = false;
  const label = document.createElement('label'); label.htmlFor = 'app-language'; label.textContent = 'Language / மொழி / भाषा';
  const select = document.createElement('select'); select.id = 'app-language';
  [['en','English'],['ta','தமிழ்'],['hi','हिन्दी']].forEach(([value,title])=>select.add(new Option(title,value)));
  const notice = document.createElement('small'); notice.setAttribute('role','status');
  control.append(label,select,notice); document.body.prepend(control);
  function setLanguage(value) {
    if (!supported.includes(value)) return;
    language = value;
    try { localStorage.setItem('shakalpa-language',value); } catch {}
    apply();
    document.dispatchEvent(new CustomEvent('languagechange',{detail:{language:value}}));
  }
  select.addEventListener('change',()=>setLanguage(select.value));
  window.addEventListener('storage',event=>{
    if (event.key === 'shakalpa-language' && supported.includes(event.newValue)) {
      language=event.newValue;
      apply();
      document.dispatchEvent(new CustomEvent('languagechange',{detail:{language}}));
    }
  });
  function originalText(element) {
    if (!element) return '';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node, text = '';
    while ((node = walker.nextNode())) {
      const prior = originals.get(node);
      text += prior && node.nodeValue === prior.rendered ? prior.source : node.nodeValue;
    }
    return text;
  }
  function originalAttribute(element,key) {
    const current = element?.getAttribute(key);
    const prior = attributes.get(element)?.[key];
    return prior && current === prior.rendered ? prior.source : current;
  }
  window.AppI18n = {t:translate,setLanguage,originalText,originalAttribute,get language(){return language;}};
  apply();
  document.dispatchEvent(new CustomEvent('languagechange',{detail:{language}}));
})();
