import { Provider } from "react-redux";
import './App.scss';
import VehicleMap from "./components/VehicleMap";
import { store } from "./store/store";

function App() {
  return (
    <Provider store={store}>
      <VehicleMap />
    </Provider>
  );
}

export default App;
