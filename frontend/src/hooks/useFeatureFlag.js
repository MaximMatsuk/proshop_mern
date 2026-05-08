import { useSelector } from 'react-redux'

export const useFeatureFlag = (name) =>
  useSelector((state) => state.featureFlags.flags[name]?.enabled ?? false)
