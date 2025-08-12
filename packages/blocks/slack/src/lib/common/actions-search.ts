interface ActionDropdownElement {
  label: string;
  value: string;
}

export function getMessageInteractiveElements(
  messageBlocks: any[],
): ActionDropdownElement[] {
  const result: ActionDropdownElement[] = [];
  const paths = findInteractiveElementsPaths(messageBlocks);

  for (const path of paths) {
    const element = getObjectByPath(messageBlocks, path);

    result.push({
      label: element.text?.text || element.type,
      value: element.text?.text || element.type,
    });
  }

  return result;
}

function findInteractiveElementsPaths(obj: any, path = ''): string[] {
  let paths: string[] = [];

  if (typeof obj === 'object' && obj !== null) {
    if (
      obj.type === 'button' ||
      obj.type?.indexOf('select') > 0 ||
      obj.type === 'radio_buttons' ||
      obj.type === 'timepicker' ||
      obj.type === 'datepicker'
    ) {
      paths.push(path);
    }
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        const newPath = path ? `${path}.${key}` : key;
        paths = paths.concat(findInteractiveElementsPaths(obj[key], newPath));
      }
    }
  }

  return paths;
}

function getObjectByPath(obj: any, path: string): any {
  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
}
