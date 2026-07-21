const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on', 'enabled']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off', 'disabled']);

export const resolveFeatureFlag = (
    value: string | boolean | undefined,
    fallback: boolean,
): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return fallback;
};

/**
 * Defaults enabled to preserve existing authoring access. Production rollout and
 * rollback are controlled explicitly with VITE_FEATURE_MANUAL_QUIZ_WORKSPACE_V1.
 */
export const isManualQuizWorkspaceEnabled = (): boolean => resolveFeatureFlag(
    import.meta.env.VITE_FEATURE_MANUAL_QUIZ_WORKSPACE_V1,
    true,
);
