    const state = {
      canvasWidth: 1920,
      canvasHeight: 1080,
      zoom: 0.65,
      panX: 0,
      panY: 0,
      isPanning: false,
      spacePressed: false,
      panStart: { x: 0, y: 0 },
      selectedId: null,
      selectedIds: [],
      groups: [],
      nextGroupId: 1,
      components: [],
      nextId: 1,
      snapToGrid: false,
      gridSize: 16,
      showGrid: false,
      showRulers: true,
      guides: [],
      nextGuideId: 1,
      sceneBackground: { mode: 'transparent', color: '#101014' },

      reference: {
        img: null,
        src: null,
        name: null,
        dirty: false,
        visible: true,
        opacity: 0.5,
        fitMode: 'contain',
        includeInSceneExport: false
      },

      drag: {
        active: false,
        mode: null,
        startX: 0,
        startY: 0,
        initialComp: null
      }
    };

    const mainCanvas = document.getElementById('mainCanvas');
    const ctx = mainCanvas.getContext('2d');
    const canvasWorld = document.getElementById('canvasWorld');
    const viewportContainer = document.getElementById('viewportContainer');
    const canvasResSelect = document.getElementById('canvasResSelect');
    const resBadgeText = document.getElementById('resBadgeText');
    const chkSnapGrid = document.getElementById('chkSnapGrid');

    const gizmoBox = document.getElementById('gizmoBox');
    const marqueeBox = document.getElementById('marqueeBox');
    const gizmoBadge = document.getElementById('gizmoBadge');
    const nineSliceGuides = document.getElementById('nineSliceGuides');
    const guideLineL = document.getElementById('guideLineL');
    const guideLineR = document.getElementById('guideLineR');
    const guideLineT = document.getElementById('guideLineT');
    const guideLineB = document.getElementById('guideLineB');

    const inputRefImage = document.getElementById('inputRefImage');
    const refDropZone = document.getElementById('refDropZone');
    const refControls = document.getElementById('refControls');
    const refOpacityRange = document.getElementById('refOpacityRange');
    const refOpacityVal = document.getElementById('refOpacityVal');
    const btnToggleRefVisible = document.getElementById('btnToggleRefVisible');
    const btnToggleRefFit = document.getElementById('btnToggleRefFit');
    const btnClearRef = document.getElementById('btnClearRef');
    const iconRefVisible = document.getElementById('iconRefVisible');
    const refUploadLabel = document.getElementById('refUploadLabel');
    const chkIncludeRefSceneExport = document.getElementById('chkIncludeRefSceneExport');

    const layersList = document.getElementById('layersList');
    const layerCountText = document.getElementById('layerCountText');
    const btnLayerUp = document.getElementById('btnLayerUp');
    const btnLayerDown = document.getElementById('btnLayerDown');
    const btnGroupLayers = document.getElementById('btnGroupLayers');
    const btnUngroupLayers = document.getElementById('btnUngroupLayers');
    const btnDuplicateLayer = document.getElementById('btnDuplicateLayer');
    const btnDeleteLayer = document.getElementById('btnDeleteLayer');
    const btnClearAll = document.getElementById('btnClearAll');

    const propName = document.getElementById('propName');
    const propTypeBadge = document.getElementById('propTypeBadge');
    const propX = document.getElementById('propX');
    const propY = document.getElementById('propY');
    const propW = document.getElementById('propW');
    const propH = document.getElementById('propH');
    const aspectRatioLabel = document.getElementById('aspectRatioLabel');
    const btnSquareSnap = document.getElementById('btnSquareSnap');

    // Icon Inspector Elements
    const slotIconDropZone = document.getElementById('slotIconDropZone');
    const inputSlotIcon = document.getElementById('inputSlotIcon');
    const iconUploadBtnText = document.getElementById('iconUploadBtnText');
    const btnRemoveIcon = document.getElementById('btnRemoveIcon');
    const iconSettingsPanel = document.getElementById('iconSettingsPanel');
    const propIconOpacity = document.getElementById('propIconOpacity');
    const iconOpacityText = document.getElementById('iconOpacityText');
    const propIconScale = document.getElementById('propIconScale');
    const iconScaleText = document.getElementById('iconScaleText');
    const propIconFilter = document.getElementById('propIconFilter');
    const propExportWithIcon = document.getElementById('propExportWithIcon');

    const propRadius = document.getElementById('propRadius');
    const propRadiusNum = document.getElementById('propRadiusNum');
    const uniformRadiusContainer = document.getElementById('uniformRadiusContainer');
    const independentRadiusContainer = document.getElementById('independentRadiusContainer');
    const btnToggleIndependentCorners = document.getElementById('btnToggleIndependentCorners');
    const propRadiusTL = document.getElementById('propRadiusTL');
    const propRadiusTR = document.getElementById('propRadiusTR');
    const propRadiusBR = document.getElementById('propRadiusBR');
    const propRadiusBL = document.getElementById('propRadiusBL');

    const propFillType = document.getElementById('propFillType');
    const propFillOpacity = document.getElementById('propFillOpacity');
    const fillOpacityVal = document.getElementById('fillOpacityVal');
    const btnFillOp0 = document.getElementById('btnFillOp0');
    const btnFillOp50 = document.getElementById('btnFillOp50');
    const btnFillOp100 = document.getElementById('btnFillOp100');
    const propFillColor1 = document.getElementById('propFillColor1');
    const propFillHex1 = document.getElementById('propFillHex1');
    const propFillColor2 = document.getElementById('propFillColor2');
    const propFillHex2 = document.getElementById('propFillHex2');
    const gradientColorContainer = document.getElementById('gradientColorContainer');

    const propBorderStyle = document.getElementById('propBorderStyle');
    const propBorderWidth = document.getElementById('propBorderWidth');
    const propBorderWidthNum = document.getElementById('propBorderWidthNum');
    const propBorderColor = document.getElementById('propBorderColor');
    const propBorderHex = document.getElementById('propBorderHex');

    const propDropShadow = document.getElementById('propDropShadow');
    const propInnerShadow = document.getElementById('propInnerShadow');
    const propShowGuides = document.getElementById('propShowGuides');

    const sliceL = document.getElementById('sliceL');
    const sliceT = document.getElementById('sliceT');
    const sliceR = document.getElementById('sliceR');
    const sliceB = document.getElementById('sliceB');
    const btnCopyJSON = document.getElementById('btnCopyJSON');
    const copyJSONLabel = document.getElementById('copyJSONLabel');

    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnZoomReset = document.getElementById('btnZoomReset');
    const btnZoomFit = document.getElementById('btnZoomFit');
    const zoomLabel = document.getElementById('zoomLabel');

    const btnAddSlot = document.getElementById('btnAddSlot');
    const btnAddButton = document.getElementById('btnAddButton');
    const btnAddBar = document.getElementById('btnAddBar');
    const btnAddPanel = document.getElementById('btnAddPanel');

    const exportScaleSelect = document.getElementById('exportScaleSelect');
    const exportFormatSelect = document.getElementById('exportFormatSelect');
    const btnExportSelected = document.getElementById('btnExportSelected');
    const btnExportBatch = document.getElementById('btnExportBatch');
    const btnExportScene = document.getElementById('btnExportScene');
    const btnSaveProject = document.getElementById('btnSaveProject');
    const inputLoadProject = document.getElementById('inputLoadProject');

    const btnOpenScriptModal = document.getElementById('btnOpenScriptModal');
    const scriptWorkbenchModal = document.getElementById('scriptWorkbenchModal');
    const btnCloseScriptModal = document.getElementById('btnCloseScriptModal');
    const btnRunScript = document.getElementById('btnRunScript');
    const btnClearScriptCode = document.getElementById('btnClearScriptCode');
    const btnClearScriptOutput = document.getElementById('btnClearScriptOutput');
    const scriptCodeInput = document.getElementById('scriptCodeInput');
    const scriptOutputLog = document.getElementById('scriptOutputLog');
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    const btnAddText = document.getElementById('btnAddText');
    const btnAddRing = document.getElementById('btnAddRing');
    const btnAddShape = document.getElementById('btnAddShape');
    const gridOverlay = document.getElementById('gridOverlay');
    const guidesLayer = document.getElementById('guidesLayer');
    const snapLinesLayer = document.getElementById('snapLinesLayer');
    const rulerTop = document.getElementById('rulerTop');
    const rulerLeft = document.getElementById('rulerLeft');
    const rulerCorner = document.getElementById('rulerCorner');
    const guideDragLabel = document.getElementById('guideDragLabel');
    const sceneBgMode = document.getElementById('sceneBgMode');
    const sceneBgColor = document.getElementById('sceneBgColor');
    const gridSizeSelect = document.getElementById('gridSizeSelect');
    const btnToggleGrid = document.getElementById('btnToggleGrid');
    const btnToggleRulers = document.getElementById('btnToggleRulers');
    const inspectorEmpty = document.getElementById('inspectorEmpty');
    const inspectorContent = document.getElementById('inspectorContent');
    const inspMultiHint = document.getElementById('inspMultiHint');
    const layerSearch = document.getElementById('layerSearch');
    const langSelect = document.getElementById('langSelect');
    const customTemplateList = document.getElementById('customTemplateList');
    const templateSaveForm = document.getElementById('templateSaveForm');
    const templateNameInput = document.getElementById('templateNameInput');
    const btnSaveTemplate = document.getElementById('btnSaveTemplate');
    const btnConfirmSaveTemplate = document.getElementById('btnConfirmSaveTemplate');
    const btnCancelSaveTemplate = document.getElementById('btnCancelSaveTemplate');
    const btnExportTemplates = document.getElementById('btnExportTemplates');
    const inputImportTemplates = document.getElementById('inputImportTemplates');

