import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      toastOptions={{
        style: {
          background: "#111",
          color: "#fff",
          border: "1px solid #2b2140",
        },
        success: { iconTheme: { primary: "#8e2afc", secondary: "#fff" } },
        error: { iconTheme: { primary: "#ff3b3b", secondary: "#fff" } },
      }}
    />
  );
}