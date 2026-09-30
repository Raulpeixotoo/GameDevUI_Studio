    // ===== Templates do usuário (bancada) =====
    // Ficam no localStorage do navegador; Exportar/Importar gera um .json para compartilhar com a comunidade.
    const TEMPLATES_KEY = 'game_dev_ui_studio_templates';
    const TEMPLATES_FORMAT = 'devui-script-templates';

    function loadCustomTemplates() {
      try {
        const list = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]');
        return Array.isArray(list) ? list.filter(isValidTemplate) : [];
      } catch (err) {
        return [];
      }
    }

    function isValidTemplate(tpl) {
      return tpl && typeof tpl.name === 'string' && tpl.name.trim() && typeof tpl.code === 'string';
    }

    function saveCustomTemplates(list) {
      try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
        return true;
      } catch (err) {
        showToast('Não foi possível salvar: armazenamento do navegador cheio.');
        return false;
      }
    }

    function renderCustomTemplates() {
      customTemplateList.textContent = '';
      const list = loadCustomTemplates();
      if (list.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'text-[11px] text-zinc-600';
        empty.textContent = t('Nenhum template salvo. Escreva um script e clique em "Salvar como template".');
        customTemplateList.appendChild(empty);
        return;
      }
      list.forEach(tpl => {
        const chip = document.createElement('span');
        chip.className = 'group inline-flex items-center rounded bg-amber-500/10 border border-amber-500/30 text-amber-200';

        const loadBtn = document.createElement('button');
        loadBtn.className = 'px-2.5 py-1 hover:text-white whitespace-nowrap';
        loadBtn.textContent = tpl.name;
        loadBtn.title = tpl.createdAt ? new Date(tpl.createdAt).toLocaleString() : '';
        loadBtn.addEventListener('click', () => {
          scriptCodeInput.value = tpl.code;
          scriptCodeInput.focus();
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'px-1.5 py-1 text-amber-500/60 hover:text-red-400';
        delBtn.textContent = '×';
        delBtn.title = t('Excluir template');
        delBtn.addEventListener('click', () => {
          if (!confirm(t('Excluir template "{name}"?', { name: tpl.name }))) return;
          if (saveCustomTemplates(loadCustomTemplates().filter(x => x.name !== tpl.name))) {
            renderCustomTemplates();
            showToast(t('Template "{name}" excluído.', { name: tpl.name }));
          }
        });

        chip.append(loadBtn, delBtn);
        customTemplateList.appendChild(chip);
      });
    }

    function setTemplateFormVisible(visible) {
      templateSaveForm.classList.toggle('hidden', !visible);
      templateSaveForm.classList.toggle('flex', visible);
      btnSaveTemplate.classList.toggle('hidden', visible);
    }

    function confirmSaveTemplate() {
      const name = templateNameInput.value.trim();
      const code = scriptCodeInput.value;
      if (!name) {
        showToast('Dê um nome ao template.');
        templateNameInput.focus();
        return;
      }
      const list = loadCustomTemplates();
      const existing = list.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.code = code;
        existing.createdAt = new Date().toISOString();
      } else {
        list.push({ name, code, createdAt: new Date().toISOString() });
      }
      if (!saveCustomTemplates(list)) return;
      setTemplateFormVisible(false);
      renderCustomTemplates();
      showToast(t(existing ? 'Template "{name}" atualizado!' : 'Template "{name}" salvo!', { name }));
    }

    btnSaveTemplate.addEventListener('click', () => {
      if (!scriptCodeInput.value.trim()) {
        showToast('Escreva algum código antes de salvar.');
        return;
      }
      setTemplateFormVisible(true);
      templateNameInput.value = '';
      templateNameInput.focus();
    });
    btnConfirmSaveTemplate.addEventListener('click', confirmSaveTemplate);
    btnCancelSaveTemplate.addEventListener('click', () => setTemplateFormVisible(false));
    templateNameInput.addEventListener('keydown', (e) => {
      // Impede que Enter/Esc cheguem ao atalho global (Esc fecharia a bancada inteira).
      e.stopPropagation();
      if (e.key === 'Enter') confirmSaveTemplate();
      else if (e.key === 'Escape') setTemplateFormVisible(false);
    });

    btnExportTemplates.addEventListener('click', () => {
      const list = loadCustomTemplates();
      if (list.length === 0) {
        showToast('Nenhum template para exportar.');
        return;
      }
      const payload = { format: TEMPLATES_FORMAT, version: 1, templates: list };
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'devui_script_templates.json');
      showToast(t('{n} template(s) exportado(s).', { n: list.length }));
    });

    inputImportTemplates.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      inputImportTemplates.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const incoming = (Array.isArray(data) ? data : data.templates || []).filter(isValidTemplate);
          if (incoming.length === 0) throw new Error('empty');
          const list = loadCustomTemplates();
          incoming.forEach(tpl => {
            const clean = { name: tpl.name.trim().slice(0, 40), code: tpl.code, createdAt: tpl.createdAt || new Date().toISOString() };
            const idx = list.findIndex(x => x.name.toLowerCase() === clean.name.toLowerCase());
            if (idx >= 0) list[idx] = clean; else list.push(clean);
          });
          if (saveCustomTemplates(list)) {
            renderCustomTemplates();
            showToast(t('{n} template(s) importado(s)!', { n: incoming.length }));
          }
        } catch (err) {
          showToast('Arquivo de templates inválido.');
        }
      };
      reader.readAsText(file);
    });

    btnOpenScriptModal.addEventListener('click', () => toggleScriptModal(true));

    // ---- Menu de export da barra superior (R7) ----
    // Fica fora do header (overflow-x cortaria), então é posicionado em coordenadas de tela ao abrir.
    const btnExportMenu = document.getElementById('btnExportMenu');
    const exportMenu = document.getElementById('exportMenu');

    function setExportMenuOpen(open) {
      exportMenu.classList.toggle('hidden', !open);
      btnExportMenu.setAttribute('aria-expanded', String(open));
      if (!open) return;
      const r = btnExportMenu.getBoundingClientRect();
      const menuW = exportMenu.offsetWidth;
      exportMenu.style.top = `${Math.round(r.bottom + 6)}px`;
      exportMenu.style.left = `${Math.round(Math.max(8, Math.min(r.right - menuW, window.innerWidth - menuW - 8)))}px`;
    }

    btnExportMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      setExportMenuOpen(exportMenu.classList.contains('hidden'));
    });
    // Os selects de formato/resolução ficam abertos; as três ações fecham o menu.
    [btnExportSelected, btnExportScene, btnExportBatch].forEach(btn => btn.addEventListener('click', () => setExportMenuOpen(false)));
    document.getElementById('btnExportScript').addEventListener('click', () => {
      setExportMenuOpen(false);
      openSelectionScript();
    });
    document.getElementById('btnScriptFromSelection').addEventListener('click', openSelectionScript);
    document.addEventListener('pointerdown', (e) => {
      if (!exportMenu.classList.contains('hidden') && !exportMenu.contains(e.target) && !btnExportMenu.contains(e.target)) setExportMenuOpen(false);
    });
    // Captura: o Esc fecha só o menu e não chega ao atalho global (que limparia a seleção).
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !exportMenu.classList.contains('hidden')) {
        e.stopPropagation();
        setExportMenuOpen(false);
        btnExportMenu.focus();
      }
    }, true);
    window.addEventListener('resize', () => setExportMenuOpen(false));
    btnCloseScriptModal.addEventListener('click', () => toggleScriptModal(false));

    window.addEventListener('load', async () => {
      setupInspectorListeners();
      setupInspectorSections(); // antes da primeira tradução: as chaves das seções ficam em PT
      setLanguage(currentLang);
      loadEditorPrefs();
      syncSceneBackgroundUI();
      renderGuides();
      canvasWorld.style.setProperty('--inv-zoom', String(1 / state.zoom));
      let restored = false;
      try {
        const saved = await readAutosave(AUTOSAVE_KEY);
        if (saved.value) restored = await loadProjectFromData(saved.value);
        // Migra do dado já carregado e reserializado (o objeto lido ganhou objetos Image, que não são clonáveis).
        if (restored && saved.fromLocal) await migrateAutosave(AUTOSAVE_KEY, getSerializedProjectData());
      } catch (err) {
        console.warn('Autosave não pôde ser lido:', err);
      }

      if (!restored) {
        await buildWelcomeScene();
      }

      try {
        const savedRef = await readAutosave(REF_AUTOSAVE_KEY);
        const ref = savedRef.value;
        if (ref && ref.src) {
          await applyReferenceImage(ref.src, ref.name, ref);
          state.reference.dirty = false;
          if (savedRef.fromLocal) await migrateAutosave(REF_AUTOSAVE_KEY, getSerializedReference());
        }
      } catch (err) {
        console.warn('Rascunho do autosave não pôde ser lido:', err);
      }

      updateHistoryButtons();
      window.studioReady = true; // cena pronta (os testes headless esperam por isto)
    });
