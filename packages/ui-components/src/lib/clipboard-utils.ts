export const clipboardUtils = {
  copyInInsecureContext: ({
    text,
    onSuccess,
    onError,
  }: {
    text: string;
    onSuccess: () => void;
    onError: () => void;
  }) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      // eslint-disable-next-line
      if (document.execCommand) {
        // eslint-disable-next-line
        document.execCommand('copy');
      }
      onSuccess();
    } catch {
      onError();
    } finally {
      document.body.removeChild(textarea);
    }
  },
};
