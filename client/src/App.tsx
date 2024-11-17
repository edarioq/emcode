import { Provider } from "react-redux";
import Map from "./components/Mapbox";
import store from "./store";

function App() {
  return (
    <Provider store={store}>
      <Map />
    </Provider>
  );
}

export default App;
