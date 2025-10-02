export const CUSTOM_MODEL_OPTION = { label: 'Custom', value: 'custom' };

export const getAiModelFromConnection = (
  model: string,
  customModel?: string,
) => {
  return model !== CUSTOM_MODEL_OPTION.value ? model : customModel;
};
