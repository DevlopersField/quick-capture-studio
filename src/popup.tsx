import React from "react";
import ReactDOM from "react-dom/client";
import { SelectionPopup } from "@/components/extension/SelectionPopup";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <SelectionPopup />
    </React.StrictMode>
);
