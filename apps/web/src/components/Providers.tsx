"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ConfigProvider } from "antd";
import { queryClient } from "@/lib/queryClient";
import { ToastContainer } from "@/components/ui/Toast";

const antTheme = {
  token: {
    colorPrimary: "#005826",
    colorPrimaryHover: "#1a7340",
    borderRadius: 8,
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme}>
        {children}
        <ToastContainer />
      </ConfigProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
