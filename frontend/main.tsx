import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "./components/WalletProvider";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WalletProvider>
      <RouterProvider router={router} />
      <Toaster />
    </WalletProvider>
  </React.StrictMode>
);
