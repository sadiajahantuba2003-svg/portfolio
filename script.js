(() => {
  const header = document.getElementById('siteHeader');
  const toggle = document.querySelector('.menu-toggle');
  const progress = document.querySelector('.scroll-progress span');
  const navLinks = [...document.querySelectorAll('.navigation a')];
  const sections = [...document.querySelectorAll('main section[id]')];
  let lastY = window.scrollY;
  let ticking = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile menu
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  navLinks.forEach(link => link.addEventListener('click', () => {
    header.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation');
  }));

  // One reveal observer, reusable for dynamically-created gallery/certificate cards.
  let revealObserver = null;
  const prepareStagger = root => {
    root.querySelectorAll('[data-stagger]').forEach(el => {
      const siblings = [...(el.parentElement?.querySelectorAll('[data-stagger]') || [])];
      el.style.setProperty('--stagger-index', Math.max(0, siblings.indexOf(el)));
    });
  };
  const observeReveals = root => {
    const els = root.querySelectorAll('.reveal:not(.reveal-observed)');
    els.forEach(el => el.classList.add('reveal-observed'));
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {threshold: 0.12, rootMargin: '0px 0px -55px 0px'});
    }
    els.forEach(el => revealObserver.observe(el));
  };
  prepareStagger(document);
  observeReveals(document);

  // Active navigation tracking
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    });
  }, {rootMargin: '-28% 0px -62% 0px', threshold: 0});
  sections.forEach(section => sectionObserver.observe(section));

  // Scroll progress + auto hide/show header
  const updateScrollUI = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    header?.classList.toggle('scrolled', window.scrollY > 10);
    const delta = window.scrollY - lastY;
    if (window.scrollY < 80 || delta < -6) header?.classList.remove('nav-hidden');
    else if (delta > 8 && !header?.classList.contains('open')) header?.classList.add('nav-hidden');
    lastY = window.scrollY;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateScrollUI); ticking = true; }
  }, {passive: true});
  updateScrollUI();

  // Subtle hero parallax only; no section background photography.
  const heroImage = document.querySelector('.hero-visual > img');
  const parallax = () => {
    if (reduced || !heroImage) return;
    const y = Math.min(window.scrollY, window.innerHeight);
    heroImage.style.transform = `translate3d(0, ${y * -0.035}px, 0)`;
  };
  window.addEventListener('scroll', parallax, {passive: true});
  parallax();

  // -------------------------------------------------------------------------
  // Automatic Gallery / Certificate discovery
  //
  // GitHub Pages cannot list a folder directly. When this site is hosted from
  // the public repository below, the GitHub Contents API is used so simply
  // uploading another image into assets/gallery or assets/certificates makes
  // it appear automatically on the next page load. Existing HTML is only a
  // fallback for offline/local viewing.
  // -------------------------------------------------------------------------
  const MEDIA_REPO = {
    owner: 'sadiajahantuba2003-svg',
    repo: 'portfolio',
    branch: 'main'
  };
  const IMAGE_EXT = /\.(avif|gif|jpe?g|png|webp|svg)$/i;
  const naturalSort = (a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
  const prettyName = filename => filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());

  async function listGitHubImages(folder) {
    const url = `https://api.github.com/repos/${encodeURIComponent(MEDIA_REPO.owner)}/${encodeURIComponent(MEDIA_REPO.repo)}/contents/${folder}?ref=${encodeURIComponent(MEDIA_REPO.branch)}`;
    const response = await fetch(url, {headers: {'Accept': 'application/vnd.github+json'}, cache: 'no-store'});
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const files = await response.json();
    return files.filter(file => file.type === 'file' && IMAGE_EXT.test(file.name)).sort((a,b) => naturalSort(a.name,b.name));
  }

  function renderGallery(files) {
    const grid = document.getElementById('galleryGrid');
    if (!grid || !files?.length) return;
    grid.innerHTML = '';
    files.forEach((file, i) => {
      const figure = document.createElement('figure');
      figure.className = `${i % 4 === 3 ? 'large ' : ''}reveal`;
      figure.dataset.stagger = '';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = file.download_url || `assets/gallery/${encodeURIComponent(file.name)}`;
      img.alt = `Gallery — ${prettyName(file.name)}`;
      figure.appendChild(img);
      grid.appendChild(figure);
    });
    prepareStagger(grid);
    observeReveals(grid);
  }

  function renderCertificates(files) {
    const grid = document.getElementById('certificateGrid');
    if (!grid || !files?.length) return;
    grid.innerHTML = '';
    files.forEach((file, i) => {
      const figure = document.createElement('figure');
      figure.className = 'reveal';
      figure.dataset.stagger = '';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = file.download_url || `assets/certificates/${encodeURIComponent(file.name)}`;
      img.alt = `Certificate — ${prettyName(file.name)}`;
      figure.appendChild(img);
      grid.appendChild(figure);
    });
    prepareStagger(grid);
    observeReveals(grid);
  }

  async function loadDynamicMedia() {
    const gallery = document.getElementById('galleryGrid');
    const certificates = document.getElementById('certificateGrid');
    try {
      const [galleryFiles, certificateFiles] = await Promise.all([
        listGitHubImages('assets/gallery'),
        listGitHubImages('assets/certificates')
      ]);
      renderGallery(galleryFiles);
      renderCertificates(certificateFiles);
    } catch (error) {
      // Offline/local fallback: the loading placeholders are replaced by the
      // existing assets via a small deterministic scan of known current files.
      const galleryFallback = Array.from({length: 20}, (_,i) => ({name:`${i+1}.jpeg`, download_url:`assets/gallery/${i+1}.jpeg`}));
      const certFallback = Array.from({length: 20}, (_,i) => ({name:`certificate-${i+1}.jpeg`, download_url:`assets/certificates/certificate-${i+1}.jpeg`}));
      renderGallery(galleryFallback);
      renderCertificates(certFallback);
      console.info('Dynamic media discovery unavailable; using local fallback.', error);
    }
    // Ensure newly rendered content is decoded smoothly.
    document.querySelectorAll('#galleryGrid img, #certificateGrid img').forEach(img => {
      img.addEventListener('load', () => img.classList.add('loaded'), {once: true});
    });
    // Give the browser a chance to recalculate scroll progress after injection.
    requestAnimationFrame(updateScrollUI);
  }
  loadDynamicMedia();



  // Premium pointer light + subtle magnetic interactions on desktop.
  const glow = document.querySelector('.pointer-glow');
  if (!reduced && glow && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', e => {
      glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    }, {passive:true});
  }
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.button,.header-cta').forEach(el => {
      el.dataset.magnetic = 'true';
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width/2)) / r.width * 8;
        const y = (e.clientY - (r.top + r.height/2)) / r.height * 8;
        el.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  // Keyboard-friendly escape for mobile menu.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && header?.classList.contains('open')) {
      header.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.focus();
    }
  });
})();
