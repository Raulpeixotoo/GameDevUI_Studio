    function getSerializedProjectData(includeReference = false) {
      const data = {
        version: "1.2",
        resolution: `${state.canvasWidth}x${state.canvasHeight}`,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        nextId: state.nextId,
        groups: state.groups || [],
        nextGroupId: state.nextGroupId || 1,
        guides: state.guides,
        nextGuideId: state.nextGuideId,
        sceneBackground: state.sceneBackground,
        components: state.components.map(comp => {
          const serialized = { ...comp };
          delete serialized.icon;
          return serialized;
        })
      };
      if (includeReference && state.reference.src) {
        data.reference = getSerializedReference();
      }
      return data;
    }

    function getSerializedReference() {
      return {
        src: state.reference.src,
        name: state.reference.name,
        visible: state.reference.visible,
        opacity: state.reference.opacity,
        fitMode: state.reference.fitMode,
        includeInSceneExport: state.reference.includeInSceneExport
      };
    }

    // Avisa uma única vez por sessão quando o localStorage (~5MB) estoura.
    let quotaWarningShown = false;
    function warnStorageQuota(err) {
      if (quotaWarningShown) return;
      if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
        quotaWarningShown = true;
        showToast('Autosave cheio (imagens grandes). Use "Salvar" para não perder o projeto!');
      }
    }

    // ===== Autosave: IndexedDB (sem o limite de ~5MB do localStorage), com localStorage de plano B =====
    // As chaves do IndexedDB têm o mesmo nome das antigas do localStorage. O objeto é gravado por
    // structured clone (sem JSON.stringify). Uma transação por gravação: o IndexedDB executa na ordem
    // de criação, então a última gravação vence.
    const IDB_NAME = 'game_dev_ui_studio';
    const IDB_STORE = 'autosave';
    let autosaveDbPromise = null;

    // Resolve com o banco, ou null quando não há IndexedDB (aí tudo segue no localStorage).
    function openAutosaveDB() {
      if (!autosaveDbPromise) {
        autosaveDbPromise = new Promise((resolve) => {
          try {
            if (!window.indexedDB) return resolve(null);
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
            req.onblocked = () => resolve(null);
          } catch (err) {
            resolve(null);
          }
        });
      }
      return autosaveDbPromise;
    }

    function idbRequest(db, mode, action) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, mode);
        const req = action(tx.objectStore(IDB_STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onabort = tx.onerror = () => reject(tx.error || req.error);
      });
    }

    // value undefined = apagar a chave.
    function persistAutosave(key, value) {
      return openAutosaveDB().then(db => {
        if (db) {
          return idbRequest(db, 'readwrite', store => value === undefined ? store.delete(key) : store.put(value, key));
        }
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      }).catch(err => {
        warnStorageQuota(err);
        console.warn('Autosave falhou:', err);
      });
    }

    // Lê do IndexedDB; se estiver vazio, cai no localStorage (autosave de versões antigas).
    // fromLocal = veio do localStorage com IndexedDB disponível, ou seja, precisa migrar.
    async function readAutosave(key) {
      const db = await openAutosaveDB();
      if (db) {
        const value = await idbRequest(db, 'readonly', store => store.get(key));
        if (value !== undefined) {
          try { localStorage.removeItem(key); } catch (err) {} // sobra de uma migração interrompida
          return { value, fromLocal: false };
        }
      }
      const raw = localStorage.getItem(key);
      return { value: raw ? JSON.parse(raw) : null, fromLocal: !!(db && raw) };
    }

    // Grava no IndexedDB e só então apaga a chave antiga do localStorage.
    async function migrateAutosave(key, value) {
      const db = await openAutosaveDB();
      if (!db) return;
      await idbRequest(db, 'readwrite', store => store.put(value, key));
      localStorage.removeItem(key);
    }

    function autoSaveToStorage() {
      persistAutosave(AUTOSAVE_KEY, getSerializedProjectData());
    }

    // O rascunho fica numa chave separada: é grande e muda pouco, então só é regravado quando marcado como sujo.
    function saveReferenceToStorage() {
      if (!state.reference.dirty) return;
      state.reference.dirty = false;
      persistAutosave(REF_AUTOSAVE_KEY, state.reference.src ? getSerializedReference() : undefined);
    }

