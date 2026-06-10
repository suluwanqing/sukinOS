
const initialState = {
  count: 0,
  message: 'Hello World'
};

function reducer(state, action) {
  switch(action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    default:
      return state;
  }
}
