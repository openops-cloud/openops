import React, { createContext, useContext, useMemo, useState } from 'react';

type SkeletonFieldContextType = {
  showSkeleton: boolean;
  setShowSkeleton: React.Dispatch<React.SetStateAction<boolean>>;
};

const defaultSetShowSkeleton: React.Dispatch<
  React.SetStateAction<boolean>
> = () => undefined;

const SkeletonFieldContext = createContext<SkeletonFieldContextType>({
  showSkeleton: false,
  setShowSkeleton: defaultSetShowSkeleton,
});

type SkeletonFieldProviderProps = {
  initialShow?: boolean;
  children: React.ReactNode;
};

const SkeletonFieldProvider = ({
  initialShow = false,
  children,
}: SkeletonFieldProviderProps) => {
  const [showSkeleton, setShowSkeleton] = useState(initialShow);

  const value = useMemo(
    () => ({ showSkeleton, setShowSkeleton }),
    [showSkeleton, setShowSkeleton],
  );

  return (
    <SkeletonFieldContext.Provider value={value}>
      {children}
    </SkeletonFieldContext.Provider>
  );
};

const useSkeletonField = (): SkeletonFieldContextType => {
  return useContext(SkeletonFieldContext);
};

SkeletonFieldProvider.displayName = 'SkeletonFieldProvider';

export { SkeletonFieldProvider, useSkeletonField };
