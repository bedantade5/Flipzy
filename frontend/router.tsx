import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import HousePage from "./app/house/page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/house",
    element: <HousePage />,
  },
]); 