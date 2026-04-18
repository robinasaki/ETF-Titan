import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ShortcutHandlers = {
  focusSearch?: () => void;
  blurSearch?: () => void;
  selectPreviousEtf?: () => void;
  selectNextEtf?: () => void;
};

type KeyboardShortcutLayerContextValue = {
  setShortcutHandlers: (handlers: ShortcutHandlers) => void;
};

const KeyboardShortcutLayerContext =
  createContext<KeyboardShortcutLayerContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    target.isContentEditable
  );
}

type KeyboardShortcutLayerProps = {
  children: ReactNode;
};

export function KeyboardShortcutLayer({ children }: KeyboardShortcutLayerProps) {
  const [shortcutHandlers, setShortcutHandlers] = useState<ShortcutHandlers>({});

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/") {
        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        shortcutHandlers.focusSearch?.();
        return;
      }

      if (event.key === "ArrowUp") {
        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        shortcutHandlers.selectPreviousEtf?.();
        return;
      }

      if (event.key === "ArrowDown") {
        if (isEditableTarget(event.target)) {
          return;
        }

        event.preventDefault();
        shortcutHandlers.selectNextEtf?.();
        return;
      }

      if (event.key === "Escape") {
        shortcutHandlers.blurSearch?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [shortcutHandlers]);

  const contextValue = useMemo(
    () => ({ setShortcutHandlers }),
    []
  );

  return (
    <KeyboardShortcutLayerContext.Provider value={contextValue}>
      {children}
    </KeyboardShortcutLayerContext.Provider>
  );
}

export function useKeyboardShortcutRegistration(handlers: ShortcutHandlers) {
  const context = useContext(KeyboardShortcutLayerContext);

  if (!context) {
    throw new Error(
      "useKeyboardShortcutRegistration must be used within KeyboardShortcutLayer."
    );
  }

  const { setShortcutHandlers } = context;
  const stableHandlers = useMemo(
    () => handlers,
    [
      handlers.focusSearch,
      handlers.blurSearch,
      handlers.selectPreviousEtf,
      handlers.selectNextEtf,
    ]
  );

  useEffect(() => {
    setShortcutHandlers(stableHandlers);
    return () => {
      setShortcutHandlers({});
    };
  }, [setShortcutHandlers, stableHandlers]);
}
