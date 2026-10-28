import { createContext, useContext, useReducer } from 'react';
import { getInitialFields } from '../data/seed.js';

const AppContext = createContext(null);

const initialState = {
  user: null,
  fields: getInitialFields(),
  fieldId: 1,
  zoneId: 'A',
  selectedPest: null,
  selectedDrugId: null,
  pestSearch: '',
  pestPart: null,
  showWeather: true,
  logSeq: 10,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload };
    case 'LOGOUT':
      return { ...state, user: null };

    case 'SELECT_ZONE':
      return { ...state, zoneId: action.payload, selectedPest: null, selectedDrugId: null };

    case 'SELECT_PEST':
      return { ...state, selectedPest: action.payload, selectedDrugId: null };

    case 'SELECT_DRUG':
      return { ...state, selectedDrugId: action.payload };

    case 'SET_PEST_SEARCH':
      return { ...state, pestSearch: action.payload };

    case 'SET_PEST_PART':
      return { ...state, pestPart: action.payload };

    case 'TOGGLE_WEATHER':
      return { ...state, showWeather: !state.showWeather };

    case 'ADD_SPRAY_LOG': {
      const { fieldId, zoneId, drugId, date } = action.payload;
      const newSeq = state.logSeq + 1;
      const fields = state.fields.map((f) =>
        f.id !== fieldId ? f : {
          ...f,
          zones: f.zones.map((z) =>
            z.id !== zoneId ? z : {
              ...z,
              logs: [...z.logs, { id: newSeq, d: date, u: drugId }],
            }
          ),
        }
      );
      return { ...state, fields, logSeq: newSeq };
    }

    case 'VOID_SPRAY_LOG': {
      const logId = action.payload;
      const fields = state.fields.map((f) => ({
        ...f,
        zones: f.zones.map((z) => ({
          ...z,
          logs: z.logs.map((l) => (l.id !== logId ? l : { ...l, void: true })),
        })),
      }));
      return { ...state, fields };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/* 헬퍼 */
export function getField(fields, fieldId) {
  return fields.find((f) => f.id === fieldId) || fields[0];
}
export function getZone(field, zoneId) {
  return field.zones.find((z) => z.id === zoneId) || field.zones[0];
}
