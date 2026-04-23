export const style = `
  .home { text-align: center; }
  .title { color: #28a745; }
`;

export default ({ state, dispatch }) => (
  <div className="home">
    <h2 className="title">Welcome to Home Page</h2>
    <p>Count: {state.count}</p>
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</button>
  </div>
);
