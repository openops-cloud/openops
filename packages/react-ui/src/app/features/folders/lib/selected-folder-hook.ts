import { ALL_SELECTED } from '@/app/features/folders/lib/folders-hooks';
import { FOLDER_ID_PARAM_NAME } from '@openops/components/ui';
import { useSearchParams } from 'react-router-dom';

export const useSelectedFolderId = () => {
  const [searchParams] = useSearchParams();

  return searchParams.get(FOLDER_ID_PARAM_NAME) || ALL_SELECTED;
};
