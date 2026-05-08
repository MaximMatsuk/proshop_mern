import {
  FEATURE_FLAGS_REQUEST,
  FEATURE_FLAGS_SUCCESS,
  FEATURE_FLAGS_FAIL,
} from '../constants/featureFlagsConstants'

const initialState = { loading: false, flags: {}, error: null }

export const featureFlagsReducer = (state = initialState, action) => {
  switch (action.type) {
    case FEATURE_FLAGS_REQUEST:
      return { ...state, loading: true, error: null }
    case FEATURE_FLAGS_SUCCESS: {
      const flags = {}
      for (const f of action.payload) {
        flags[f.name] = f
      }
      return { loading: false, flags, error: null }
    }
    case FEATURE_FLAGS_FAIL:
      // fail closed: flags={} → все хуки вернут false
      return { loading: false, flags: {}, error: action.payload }
    default:
      return state
  }
}
