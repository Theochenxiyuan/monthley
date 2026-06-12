import { computed, nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue';

interface PanelPosition {
  x: number;
  y: number;
}

interface PanelSize {
  width: number;
  height: number;
}

interface PanelLayout extends PanelPosition, PanelSize {}

type HorizontalAnchor = 'left' | 'right';
type VerticalAnchor = 'top' | 'bottom';

interface AnchoredPanelLayout extends PanelSize {
  horizontalAnchor: HorizontalAnchor;
  verticalAnchor: VerticalAnchor;
  offsetX: number;
  offsetY: number;
}

interface UseDraggablePanelOptions {
  storageKey: string;
  getDefaultPosition: () => PanelPosition;
  getDefaultSize: () => PanelSize;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const VIEWPORT_PADDING = 8;

function isAnchoredLayout(value: Partial<AnchoredPanelLayout & PanelLayout>): value is AnchoredPanelLayout {
  return (
    (value.horizontalAnchor === 'left' || value.horizontalAnchor === 'right') &&
    (value.verticalAnchor === 'top' || value.verticalAnchor === 'bottom') &&
    typeof value.offsetX === 'number' &&
    typeof value.offsetY === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  );
}

function isLegacyLayout(value: Partial<AnchoredPanelLayout & PanelLayout>): value is PanelLayout {
  return (
    typeof value.x === 'number' &&
    typeof value.y === 'number'
  );
}

function readStoredLayout(storageKey: string): Partial<AnchoredPanelLayout & PanelLayout> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnchoredPanelLayout & PanelLayout>;
    if (!isAnchoredLayout(parsed) && !isLegacyLayout(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useDraggablePanel(
  panelRef: Ref<HTMLElement | null>,
  options: UseDraggablePanelOptions,
) {
  const position = ref<PanelPosition>({ x: 0, y: 0 });
  const size = ref<PanelSize>(options.getDefaultSize());
  const isDragging = ref(false);
  const isResizing = ref(false);
  const hasCustomLayout = ref(false);
  let dragOffset: PanelPosition = { x: 0, y: 0 };
  let resizeStartPointer: PanelPosition = { x: 0, y: 0 };
  let resizeStartSize: PanelSize = { width: 0, height: 0 };
  let activePointerId: number | null = null;
  let anchorLayout: AnchoredPanelLayout | null = null;

  function getSizeLimits() {
    return {
      minWidth: options.minWidth ?? 180,
      minHeight: options.minHeight ?? 220,
      maxWidth: Math.min(options.maxWidth ?? 360, window.innerWidth - VIEWPORT_PADDING * 2),
      maxHeight: Math.min(options.maxHeight ?? window.innerHeight - 96, window.innerHeight - VIEWPORT_PADDING * 2),
    };
  }

  function clampSize(nextSize: PanelSize): PanelSize {
    const limits = getSizeLimits();
    return {
      width: Math.min(Math.max(nextSize.width, limits.minWidth), limits.maxWidth),
      height: Math.min(Math.max(nextSize.height, limits.minHeight), limits.maxHeight),
    };
  }

  function clampPosition(nextPosition: PanelPosition): PanelPosition {
    const width = size.value.width;
    const height = size.value.height;
    const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
    const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING);

    return {
      x: Math.min(Math.max(nextPosition.x, VIEWPORT_PADDING), maxX),
      y: Math.min(Math.max(nextPosition.y, VIEWPORT_PADDING), maxY),
    };
  }

  function positionToAnchoredLayout(): AnchoredPanelLayout {
    const leftOffset = position.value.x;
    const rightOffset = window.innerWidth - position.value.x - size.value.width;
    const topOffset = position.value.y;
    const bottomOffset = window.innerHeight - position.value.y - size.value.height;
    const horizontalAnchor: HorizontalAnchor = leftOffset <= rightOffset ? 'left' : 'right';
    const verticalAnchor: VerticalAnchor = topOffset <= bottomOffset ? 'top' : 'bottom';

    return {
      horizontalAnchor,
      verticalAnchor,
      offsetX: horizontalAnchor === 'left' ? leftOffset : rightOffset,
      offsetY: verticalAnchor === 'top' ? topOffset : bottomOffset,
      ...size.value,
    };
  }

  function anchoredLayoutToPosition(layout: AnchoredPanelLayout): PanelPosition {
    return clampPosition({
      x: layout.horizontalAnchor === 'left'
        ? layout.offsetX
        : window.innerWidth - size.value.width - layout.offsetX,
      y: layout.verticalAnchor === 'top'
        ? layout.offsetY
        : window.innerHeight - size.value.height - layout.offsetY,
    });
  }

  function updateAnchorFromCurrentLayout() {
    anchorLayout = positionToAnchoredLayout();
  }

  function persistLayout() {
    updateAnchorFromCurrentLayout();
    hasCustomLayout.value = true;
    localStorage.setItem(options.storageKey, JSON.stringify(anchorLayout));
  }

  function setPosition(nextPosition: PanelPosition, shouldPersist = true) {
    position.value = clampPosition(nextPosition);
    if (shouldPersist) persistLayout();
  }

  function setSize(nextSize: PanelSize, shouldPersist = true) {
    size.value = clampSize(nextSize);
    position.value = clampPosition(
      hasCustomLayout.value ? position.value : options.getDefaultPosition(),
    );
    if (shouldPersist) persistLayout();
  }

  function resetLayout() {
    localStorage.removeItem(options.storageKey);
    anchorLayout = null;
    hasCustomLayout.value = false;
    size.value = clampSize(options.getDefaultSize());
    setPosition(options.getDefaultPosition(), false);
  }

  function alignToDefaultPosition() {
    if (hasCustomLayout.value) return;
    setPosition(options.getDefaultPosition(), false);
  }

  function initializeLayout() {
    const stored = readStoredLayout(options.storageKey);
    const defaultSize = options.getDefaultSize();
    const defaultPosition = options.getDefaultPosition();
    const storedSize = stored && typeof stored.width === 'number' && typeof stored.height === 'number'
      ? { width: stored.width, height: stored.height }
      : defaultSize;

    size.value = clampSize(storedSize);

    if (stored && isAnchoredLayout(stored)) {
      hasCustomLayout.value = true;
      anchorLayout = {
        ...stored,
        ...size.value,
      };
      position.value = anchoredLayoutToPosition(anchorLayout);
      return;
    }

    if (stored && typeof stored.x === 'number' && typeof stored.y === 'number') {
      hasCustomLayout.value = true;
      position.value = clampPosition({ x: stored.x, y: stored.y });
      updateAnchorFromCurrentLayout();
      return;
    }

    size.value = clampSize({
      width: defaultSize.width,
      height: defaultSize.height,
    });
    hasCustomLayout.value = false;
    setPosition(defaultPosition, false);
  }

  function handleDragMove(event: PointerEvent) {
    if (!isDragging.value || activePointerId !== event.pointerId) return;
    event.preventDefault();
    position.value = clampPosition({
      x: event.clientX - dragOffset.x,
      y: event.clientY - dragOffset.y,
    });
    anchorLayout = null;
  }

  function handleResizeMove(event: PointerEvent) {
    if (!isResizing.value || activePointerId !== event.pointerId) return;
    event.preventDefault();
    setSize({
      width: resizeStartSize.width + event.clientX - resizeStartPointer.x,
      height: resizeStartSize.height + event.clientY - resizeStartPointer.y,
    }, false);
    anchorLayout = null;
  }

  function stopDragging(event?: PointerEvent) {
    if (!isDragging.value) return;
    if (event && activePointerId !== event.pointerId) return;
    isDragging.value = false;
    activePointerId = null;
    persistLayout();
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);
  }

  function stopResizing(event?: PointerEvent) {
    if (!isResizing.value) return;
    if (event && activePointerId !== event.pointerId) return;
    isResizing.value = false;
    activePointerId = null;
    persistLayout();
    window.removeEventListener('pointermove', handleResizeMove);
    window.removeEventListener('pointerup', stopResizing);
    window.removeEventListener('pointercancel', stopResizing);
  }

  function startDragging(event: PointerEvent) {
    if (event.button !== 0) return;
    const panel = panelRef.value;
    if (!panel) return;

    event.preventDefault();
    activePointerId = event.pointerId;
    isDragging.value = true;
    dragOffset = {
      x: event.clientX - position.value.x,
      y: event.clientY - position.value.y,
    };

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
  }

  function startResizing(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    activePointerId = event.pointerId;
    isResizing.value = true;
    resizeStartPointer = { x: event.clientX, y: event.clientY };
    resizeStartSize = { ...size.value };

    window.addEventListener('pointermove', handleResizeMove);
    window.addEventListener('pointerup', stopResizing);
    window.addEventListener('pointercancel', stopResizing);
  }

  function handleResize() {
    setSize(size.value, false);
    if (!hasCustomLayout.value) {
      position.value = clampPosition(options.getDefaultPosition());
      return;
    }

    if (anchorLayout) {
      anchorLayout = {
        ...anchorLayout,
        ...size.value,
      };
      position.value = anchoredLayoutToPosition(anchorLayout);
    } else {
      position.value = clampPosition(position.value);
    }
  }

  onMounted(() => {
    nextTick(initializeLayout);
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    stopDragging();
    stopResizing();
    window.removeEventListener('resize', handleResize);
  });

  const panelStyle = computed(() => ({
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
    width: `${size.value.width}px`,
    height: `${size.value.height}px`,
  }));

  return {
    isDragging,
    isResizing,
    hasCustomLayout,
    alignToDefaultPosition,
    panelStyle,
    resetLayout,
    startDragging,
    startResizing,
  };
}
